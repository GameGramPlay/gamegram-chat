import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import supabase from "../supabaseClient";

const AppContext = createContext({});

// Config
const MESSAGES_PER_PAGE = 50;
const CHAT_CHANNEL_NAME = "custom-all-channel";
const LOCATION_API_URL = "https://api.db-ip.com/v2/free/self";
const SCROLL_THRESHOLD = 5;
const AUTO_UPDATE_INTERVAL = 1000;
const CONNECTION_CHECK_INTERVAL = 10000;
const MAX_RECONNECT_ATTEMPTS = 5;

const AppContextProvider = ({ children }) => {
  const scrollRef = useRef();
  const lastMessageIdRef = useRef(null);
  const myChannelRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const autoUpdateRef = useRef(null);

  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);
  const [country, setCountry] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState("");
  const [newMessageTrigger, setNewMessageTrigger] = useState(null);
  const [isOnBottom, setIsOnBottom] = useState(true);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // --- Utility functions ---
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  const randomUsername = useCallback(() => `@user${Date.now().toString().slice(-4)}`, []);

  const initializeUser = useCallback((session) => {
    setSession(session);
    const name =
      session?.user?.user_metadata?.user_name ||
      localStorage.getItem("username") ||
      randomUsername();
    setUsername(name);
    localStorage.setItem("username", name);
  }, [randomUsername]);

  const getLocation = useCallback(async () => {
    try {
      const res = await fetch(LOCATION_API_URL);
      const data = await res.json();
      if (data?.countryCode) {
        setCountry(data.countryCode);
        localStorage.setItem("countryCode", data.countryCode);
      }
    } catch (err) {
      console.error("Location error:", err.message);
    }
  }, []);

  // --- Messages handlers ---
  const handleNewMessage = useCallback(
    (payload) => {
      const newMsg = payload?.new;
      if (!newMsg || messages.some(m => m.id === newMsg.id)) return;

      lastMessageIdRef.current = newMsg.id;
      setMessages(prev => [newMsg, ...prev]);
      setNewMessageTrigger(newMsg);
    },
    [messages]
  );

  const fetchNewMessages = useCallback(async () => {
    if (!lastMessageIdRef.current) return;
    try {
      const { data } = await supabase
        .from("messages")
        .select()
        .gt("id", lastMessageIdRef.current)
        .order("id", { ascending: false });
      if (!data?.length) return;

      lastMessageIdRef.current = Math.max(...data.map(m => m.id));
      setMessages(prev => {
        const existing = new Set(prev.map(m => m.id));
        const newMsgs = data.filter(m => !existing.has(m.id));
        if (!newMsgs.length) return prev;
        setNewMessageTrigger(newMsgs[0]);
        return [...newMsgs, ...prev];
      });
    } catch (err) {
      console.error("Fetch new messages error:", err);
    }
  }, []);

  // --- Typing indicator ---
  const setUserTyping = useCallback(async () => {
    if (!myChannelRef.current) return;
    await supabase
      .from("typing")
      .upsert({ username, channel: CHAT_CHANNEL_NAME, last_seen: new Date() });
  }, [username]);

  const subscribeTyping = useCallback(() => {
    supabase
      .from("typing")
      .on("UPDATE", payload => {
        const user = payload.new.username;
        if (user !== username) {
          setTypingUsers(prev => [...new Set([...prev, user])]);
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u !== user));
          }, 3000);
        }
      })
      .subscribe();
  }, [username]);

  // --- Channel subscription ---
  const createChannel = useCallback(() => {
    if (myChannelRef.current) return;

    myChannelRef.current = supabase
      .channel(CHAT_CHANNEL_NAME, { config: { broadcast: { self: true } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleNewMessage)
      .subscribe((status, err) => {
        if (err) console.error(err);
      });
  }, [handleNewMessage]);

  const reconnectChannel = useCallback(() => {
    if (myChannelRef.current) supabase.removeChannel(myChannelRef.current);
    myChannelRef.current = null;
    createChannel();
  }, [createChannel]);

  const startAutoUpdate = useCallback(() => {
    if (autoUpdateRef.current) return;
    autoUpdateRef.current = setInterval(() => {
      fetchNewMessages();
    }, AUTO_UPDATE_INTERVAL);
  }, [fetchNewMessages]);

  const loadInitialMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select()
        .range(0, MESSAGES_PER_PAGE)
        .order("id", { ascending: false });
      setLoadingInitial(false);
      if (error) return setError(error.message);
      if (data?.length) lastMessageIdRef.current = Math.max(...data.map(m => m.id));
      setMessages(data || []);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setLoadingInitial(false);
      setError(err.message);
    }
  }, [scrollToBottom]);

  const initChat = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    initializeUser(session);
    await loadInitialMessages();
    createChannel();
    startAutoUpdate();

    const storedCountry = localStorage.getItem("countryCode");
    if (storedCountry) setCountry(storedCountry);
    else getLocation();

    subscribeTyping();
  }, [initializeUser, loadInitialMessages, createChannel, startAutoUpdate, getLocation, subscribeTyping]);

  useEffect(() => {
    initChat();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchNewMessages();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", fetchNewMessages);

    return () => {
      if (myChannelRef.current) supabase.removeChannel(myChannelRef.current);
      clearInterval(autoUpdateRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", fetchNewMessages);
    };
  }, [initChat, fetchNewMessages]);

  useEffect(() => {
    if (!newMessageTrigger) return;
    if (newMessageTrigger.username === username) scrollToBottom();
    else setUnviewedCount(prev => prev + 1);
  }, [newMessageTrigger, username, scrollToBottom]);

  const onScroll = async ({ target }) => {
    const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + SCROLL_THRESHOLD;
    setIsOnBottom(atBottom);
    if (atBottom) setUnviewedCount(0);

    if (target.scrollTop === 0) {
      const { data, error } = await supabase
        .from("messages")
        .select()
        .range(messages.length, messages.length + MESSAGES_PER_PAGE)
        .order("id", { ascending: false });
      if (!error && data?.length) setMessages(prev => [...prev, ...data]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        messages,
        loadingInitial,
        error,
        username,
        setUsername,
        randomUsername,
        scrollRef,
        onScroll,
        scrollToBottom,
        isOnBottom,
        unviewedCount,
        typingUsers,
        onlineUsers,
        country,
        session,
        setUserTyping,
        refreshMessages: fetchNewMessages,
        reconnectChannel,
        getMessagesAndSubscribe: initChat,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => useContext(AppContext);

export { AppContextProvider, useAppContext };
export default AppContext;

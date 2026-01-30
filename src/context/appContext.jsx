import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import supabase from "../supabaseClient";

const AppContext = createContext({});

// Config
const MESSAGES_PER_PAGE = 50;
const CHAT_CHANNEL_NAME = "custom-all-channel";
const LOCATION_API_URL = "https://api.db-ip.com/v2/free/self";
const SCROLL_THRESHOLD = 5; // pixels
const AUTO_UPDATE_INTERVAL = 1000; // 1s
const CONNECTION_CHECK_INTERVAL = 10000; // 10s
const MAX_RECONNECT_ATTEMPTS = 5;

const AppContextProvider = ({ children }) => {
  // Refs
  const myChannelRef = useRef(null);
  const scrollRef = useRef();
  const lastMessageIdRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const autoUpdateRef = useRef(null);
  const connectionCheckRef = useRef(null);

  // User state
  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);
  const [country, setCountry] = useState("");

  // Messages state
  const [messages, setMessages] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState("");
  const [newMessageTrigger, setNewMessageTrigger] = useState(null);

  // UI state
  const [isOnBottom, setIsOnBottom] = useState(true);
  const [unviewedCount, setUnviewedCount] = useState(0);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Scroll
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
      if (!data?.countryCode) return;
      setCountry(data.countryCode);
      localStorage.setItem("countryCode", data.countryCode);
    } catch (err) {
      console.error("Location error:", err.message);
    }
  }, []);

  // New message handler
  const handleNewMessage = useCallback((payload) => {
    const newMsg = payload?.new;
    if (!newMsg || messages.some(m => m.id === newMsg.id)) return;

    lastMessageIdRef.current = newMsg.id;
    setMessages(prev => [newMsg, ...prev]);
    setNewMessageTrigger(newMsg);
  }, [messages]);

  // Fetch new messages (fallback polling)
  const fetchNewMessages = useCallback(async () => {
    if (!lastMessageIdRef.current) return;
    try {
      const { data } = await supabase
        .from("messages")
        .select()
        .gt("id", lastMessageIdRef.current)
        .order("id", { ascending: false });
      if (!data || data.length === 0) return;

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

  // Auto-update polling
  const startAutoUpdate = useCallback(() => {
    if (autoUpdateRef.current) return;
    autoUpdateRef.current = setInterval(() => {
      if (!isRealtimeConnected) fetchNewMessages();
    }, AUTO_UPDATE_INTERVAL);
  }, [fetchNewMessages, isRealtimeConnected]);

  const stopAutoUpdate = useCallback(() => {
    clearInterval(autoUpdateRef.current);
    autoUpdateRef.current = null;
  }, []);

  // Initial messages load
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
      setTimeout(scrollToBottom, 50); // smooth initial scroll
    } catch (err) {
      setLoadingInitial(false);
      setError(err.message);
    }
  }, [scrollToBottom]);

  // Channel subscription
  const createChannel = useCallback(() => {
    if (myChannelRef.current) return;
    myChannelRef.current = supabase
      .channel(CHAT_CHANNEL_NAME, { config: { broadcast: { self: true } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleNewMessage)
      .subscribe((status, err) => {
        setConnectionStatus(status);
        setIsRealtimeConnected(status === "SUBSCRIBED");
        if (status === "TIMED_OUT" && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          setTimeout(() => reconnectChannel(), Math.min(5000, reconnectAttemptsRef.current * 1000));
        }
        if (err) console.error(err);
      });
  }, [handleNewMessage]);

  const reconnectChannel = useCallback(() => {
    if (myChannelRef.current) supabase.removeChannel(myChannelRef.current);
    myChannelRef.current = null;
    createChannel();
  }, [createChannel]);

  const initChat = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    initializeUser(session);
    await loadInitialMessages();
    createChannel();
    startAutoUpdate();

    const storedCountry = localStorage.getItem("countryCode");
    if (storedCountry) setCountry(storedCountry);
    else getLocation();
  }, [initializeUser, loadInitialMessages, createChannel, startAutoUpdate, getLocation]);

  useEffect(() => {
    initChat();

    const checkConnection = setInterval(() => {
      if (myChannelRef.current?.state !== "joined") reconnectChannel();
    }, CONNECTION_CHECK_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchNewMessages();
    };
    const handleOnline = () => fetchNewMessages();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      if (myChannelRef.current) supabase.removeChannel(myChannelRef.current);
      stopAutoUpdate();
      clearInterval(checkConnection);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [initChat, reconnectChannel, fetchNewMessages, stopAutoUpdate]);

  // Handle new message trigger
  useEffect(() => {
    if (!newMessageTrigger) return;
    if (newMessageTrigger.username === username) scrollToBottom();
    else setUnviewedCount(prev => prev + 1);
  }, [newMessageTrigger, username, scrollToBottom]);

  // Scroll handler
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
      if (!error && data?.length) {
        setMessages(prev => [...prev, ...data]);
        target.scrollTop = 1; // preserve scroll
      }
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
        country,
        session,
        connectionStatus,
        isRealtimeConnected,
        refreshMessages: fetchNewMessages,
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

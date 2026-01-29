import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import supabase from "../supabaseClient";

const AppContext = createContext({});

// Constants
const MESSAGES_PER_PAGE = 49;
const CHAT_CHANNEL_NAME = "custom-all-channel";
const LOCATION_API_URL = "https://api.db-ip.com/v2/free/self";
const SCROLL_THRESHOLD = 1; // pixels from bottom to consider "at bottom"
const AUTO_UPDATE_INTERVAL = 1000; // 1 second fallback polling interval for near-instant refresh
const CONNECTION_CHECK_INTERVAL = 10000; // 10 seconds connection health check
const MAX_RECONNECT_ATTEMPTS = 5;

const AppContextProvider = ({ children }) => {
  // Refs
  const myChannelRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const scrollRef = useRef();
  const autoUpdateIntervalRef = useRef(null);
  const connectionCheckIntervalRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // User state
  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);
  const [countryCode, setCountryCode] = useState("");

  // Messages state
  const [messages, setMessages] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [newIncomingMessageTrigger, setNewIncomingMessageTrigger] = useState(null);

  // UI state
  const [isOnBottom, setIsOnBottom] = useState(false);
  const [unviewedMessageCount, setUnviewedMessageCount] = useState(0);
  const [routeHash, setRouteHash] = useState("");

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Scroll utilities
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  // Scroll to bottom when initial messages are loaded
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      scrollToBottom();
    }
  }, [messages, isInitialLoad, scrollToBottom]);

  // User utilities
  const randomUsername = useCallback(() => {
    return `@user${Date.now().toString().slice(-4)}`;
  }, []);

  const getLocation = useCallback(async () => {
    try {
      const res = await fetch(LOCATION_API_URL);
      const { countryCode, error } = await res.json();
      if (error) throw new Error(error);

      setCountryCode(countryCode);
      localStorage.setItem("countryCode", countryCode);
    } catch (error) {
      console.error("Error getting location:", error.message);
    }
  }, []);

  const initializeUser = useCallback((session) => {
    setSession(session);

    const username = session
      ? session.user.user_metadata.user_name
      : localStorage.getItem("username") || randomUsername();

    setUsername(username);
    localStorage.setItem("username", username);
  }, [randomUsername, setSession, setUsername]);

  // Message handlers
  const handleNewMessage = useCallback((payload) => {
    if (payload.new && payload.new.id) {
      lastMessageIdRef.current = payload.new.id;
    }
    setMessages((prevMessages) => {
      // Prevent duplicate messages
      if (prevMessages.some(msg => msg.id === payload.new?.id)) {
        return prevMessages;
      }
      return [payload.new, ...prevMessages];
    });
    // Trigger effect to check if we should scroll or show notification
    setNewIncomingMessageTrigger(payload.new);
  }, []);

  // Fetch new messages since last known ID (for auto-update fallback)
  const fetchNewMessages = useCallback(async () => {
    if (!lastMessageIdRef.current) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select()
        .gt("id", lastMessageIdRef.current)
        .order("id", { ascending: false });

      if (fetchError) {
        console.error("Auto-update fetch error:", fetchError.message);
        return;
      }

      if (data && data.length > 0) {
        // Update last message ID
        lastMessageIdRef.current = Math.max(...data.map(m => m.id));

        setMessages((prevMessages) => {
          // Filter out any duplicates
          const existingIds = new Set(prevMessages.map(m => m.id));
          const newMessages = data.filter(m => !existingIds.has(m.id));
          if (newMessages.length === 0) return prevMessages;

          // Trigger notification for new messages
          if (newMessages.length > 0) {
            setNewIncomingMessageTrigger(newMessages[0]);
          }
          return [...newMessages, ...prevMessages];
        });
      }
    } catch (err) {
      console.error("Auto-update error:", err);
    }
  }, []);

  // Start auto-update polling (fallback when realtime is disconnected)
  const startAutoUpdate = useCallback(() => {
    if (autoUpdateIntervalRef.current) return;

    autoUpdateIntervalRef.current = setInterval(() => {
      if (!isRealtimeConnected) {
        fetchNewMessages();
      }
    }, AUTO_UPDATE_INTERVAL);
  }, [fetchNewMessages, isRealtimeConnected]);

  // Stop auto-update polling
  const stopAutoUpdate = useCallback(() => {
    if (autoUpdateIntervalRef.current) {
      clearInterval(autoUpdateIntervalRef.current);
      autoUpdateIntervalRef.current = null;
    }
  }, []);

  const getInitialMessages = useCallback(async () => {
    if (messages.length) return;

    const { data, error } = await supabase
      .from("messages")
      .select()
      .range(0, MESSAGES_PER_PAGE)
      .order("id", { ascending: false });

    setLoadingInitial(false);
    if (error) {
      setError(error.message);
      return;
    }

    // Track the latest message ID for auto-update
    if (data && data.length > 0) {
      lastMessageIdRef.current = Math.max(...data.map(m => m.id));
    }

    setIsInitialLoad(true);
    setMessages(data);
  }, [messages.length]);

  // Handle channel subscription status changes
  const handleSubscriptionStatus = useCallback((status, err) => {
    setConnectionStatus(status);

    if (status === "SUBSCRIBED") {
      setIsRealtimeConnected(true);
      reconnectAttemptsRef.current = 0;
      setError("");
    } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
      setIsRealtimeConnected(false);
      if (err) {
        console.error("Channel error:", err);
      }
    } else if (status === "TIMED_OUT") {
      setIsRealtimeConnected(false);
      // Attempt reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        setTimeout(() => {
          reconnectChannel();
        }, Math.min(reconnectAttemptsRef.current * 1000, 5000));
      }
    }
  }, []);

  // Reconnect the channel
  const reconnectChannel = useCallback(() => {
    if (myChannelRef.current) {
      supabase.removeChannel(myChannelRef.current);
      myChannelRef.current = null;
    }
    createChannelSubscription();
  }, []);

  const createChannelSubscription = useCallback(() => {
    if (myChannelRef.current) return;

    myChannelRef.current = supabase
      .channel(CHAT_CHANNEL_NAME, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        handleNewMessage
      )
      .subscribe((status, err) => {
        handleSubscriptionStatus(status, err);
      });
  }, [handleNewMessage, handleSubscriptionStatus]);

  const getMessagesAndSubscribe = useCallback(async () => {
    setError("");
    await getInitialMessages();
    createChannelSubscription();
    startAutoUpdate();
  }, [getInitialMessages, createChannelSubscription, startAutoUpdate]);

  // Connection health check
  const checkConnectionHealth = useCallback(() => {
    if (myChannelRef.current) {
      const state = myChannelRef.current.state;
      if (state !== "joined" && state !== "joining") {
        setIsRealtimeConnected(false);
        setConnectionStatus("disconnected");
        // Trigger reconnection if not actively trying
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectChannel();
        }
      }
    }
  }, [reconnectChannel]);

  // Initialize app: auth, messages, location, and subscriptions
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Initialize user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeUser(session);
    });

    // Load messages and subscribe to real-time updates
    getMessagesAndSubscribe();

    // Load country code from localStorage or fetch from API
    const storedCountryCode = localStorage.getItem("countryCode");
    if (storedCountryCode && storedCountryCode !== "undefined") {
      setCountryCode(storedCountryCode);
    } else {
      getLocation();
    }

    // Listen for auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("onAuthStateChange", { _event, session });
      initializeUser(session);
    });

    // Start connection health check interval
    connectionCheckIntervalRef.current = setInterval(checkConnectionHealth, CONNECTION_CHECK_INTERVAL);

    // Handle visibility change - reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Fetch any missed messages when returning to tab
        fetchNewMessages();
        // Check and reconnect if needed
        if (!isRealtimeConnected) {
          reconnectChannel();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle online/offline events
    const handleOnline = () => {
      fetchNewMessages();
      if (!isRealtimeConnected) {
        reconnectChannel();
      }
    };
    window.addEventListener("online", handleOnline);

    return () => {
      // Cleanup: remove channel subscription
      if (myChannelRef.current) {
        supabase.removeChannel(myChannelRef.current);
        myChannelRef.current = null;
      }

      authSubscription.unsubscribe();
      hasInitializedRef.current = false;

      // Cleanup intervals
      stopAutoUpdate();
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
        connectionCheckIntervalRef.current = null;
      }

      // Cleanup event listeners
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle new incoming messages: scroll if from current user, otherwise show notification
  useEffect(() => {
    if (!newIncomingMessageTrigger) return;

    if (newIncomingMessageTrigger.username === username) {
      scrollToBottom();
    } else {
      setUnviewedMessageCount((prevCount) => prevCount + 1);
    }
  }, [newIncomingMessageTrigger, username, scrollToBottom]);

  // Handle scroll events: detect bottom position and load more messages at top
  const onScroll = async ({ target }) => {
    const isAtBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + SCROLL_THRESHOLD;

    if (isAtBottom) {
      setUnviewedMessageCount(0);
      setIsOnBottom(true);
    } else {
      setIsOnBottom(false);
    }

    // Load more messages when scrolling to top
    if (target.scrollTop === 0) {
      const { data, error } = await supabase
        .from("messages")
        .select()
        .range(messages.length, messages.length + MESSAGES_PER_PAGE)
        .order("id", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }

      // Maintain scroll position after loading
      target.scrollTop = 1;
      setMessages((prevMessages) => [...prevMessages, ...data]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        messages,
        loadingInitial,
        error,
        getMessagesAndSubscribe,
        username,
        setUsername,
        randomUsername,
        routeHash,
        scrollRef,
        onScroll,
        scrollToBottom,
        isOnBottom,
        country: countryCode,
        unviewedMessageCount,
        session,
        connectionStatus,
        isRealtimeConnected,
        refreshMessages: fetchNewMessages,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => useContext(AppContext);

export { AppContext as default, AppContextProvider, useAppContext };

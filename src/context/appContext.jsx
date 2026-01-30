import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import supabase from "../supabaseClient";

const AppContext = createContext({});

// config
const MESSAGES_PER_PAGE = 50;
const CHAT_CHANNEL_NAME = "custom-all-channel";
const LOCATION_API_URL = "https://api.db-ip.com/v2/free/self";
const SCROLL_THRESHOLD = 5;

export function AppContextProvider({ children }) {
  // refs
  const scrollRef = useRef(null);
  const messagesSubscriptionRef = useRef(null);
  const reactionsSubscriptionRef = useRef(null);

  // user
  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);
  const [country, setCountry] = useState("");

  // channels
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);

  // messages + UI
  const [messages, setMessages] = useState([]); // newest first
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState("");
  const [isOnBottom, setIsOnBottom] = useState(true);
  const [unviewedCount, setUnviewedCount] = useState(0);

  // typing & presence (placeholders — you can extend)
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // --- util: random username
  const randomUsername = useCallback(() => `@user${Date.now().toString().slice(-4)}`, []);

  const initializeUser = useCallback(async (sesh) => {
    setSession(sesh);
    const name =
      sesh?.user?.user_metadata?.user_name ||
      localStorage.getItem("username") ||
      randomUsername();
    setUsername(name);
    localStorage.setItem("username", name);
  }, [randomUsername]);

  const getLocation = useCallback(async () => {
    try {
      const res = await fetch(LOCATION_API_URL);
      const d = await res.json();
      if (d?.countryCode) {
        setCountry(d.countryCode);
        localStorage.setItem("countryCode", d.countryCode);
      }
    } catch (err) {
      console.error("Location error", err);
    }
  }, []);

  // --- channels
  const fetchChannels = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("channels").select("*").order("id", { ascending: true });
      if (error) throw error;
      setChannels(data || []);
      // if no current channel, set first (general)
      if (!currentChannel) {
        const chan = (data && data[0]) || null;
        if (chan) setCurrentChannel(chan);
      }
    } catch (err) {
      console.error("fetchChannels:", err.message || err);
    }
  }, [currentChannel]);

  // --- messages + reactions fetching helpers
  const attachReactionsToMessages = useCallback(async (msgs) => {
    if (!msgs || msgs.length === 0) return msgs;
    try {
      const ids = msgs.map((m) => m.id);
      const { data: reactions } = await supabase
        .from("reactions")
        .select("*")
        .in("message_id", ids);

      const grouped = {};
      (reactions || []).forEach((r) => {
        grouped[r.message_id] = grouped[r.message_id] || [];
        grouped[r.message_id].push({ id: r.id, emoji: r.emoji, username: r.username });
      });

      return msgs.map((m) => ({ ...m, reactions: grouped[m.id] || [] }));
    } catch (err) {
      console.error("attachReactionsToMessages", err);
      return msgs;
    }
  }, []);

  // load messages for a channel (newest-first)
  const loadMessagesForChannel = useCallback(
    async (channel) => {
      if (!channel) return;
      setLoadingInitial(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("channel_id", channel.id)
          .range(0, MESSAGES_PER_PAGE)
          .order("id", { ascending: false });
        if (error) throw error;
        const withReactions = await attachReactionsToMessages(data || []);
        setMessages(withReactions || []);
      } catch (err) {
        console.error("loadMessagesForChannel:", err.message || err);
        setError(err.message || "Error loading messages");
      } finally {
        setLoadingInitial(false);
        // scroll to bottom on initial load
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 50);
      }
    },
    [attachReactionsToMessages]
  );

  // realtime subscriptions
  const subscribeRealtime = useCallback((channel) => {
    if (!channel) return;

    // Unsubscribe previous
    if (messagesSubscriptionRef.current) {
      supabase.removeChannel(messagesSubscriptionRef.current);
      messagesSubscriptionRef.current = null;
    }
    if (reactionsSubscriptionRef.current) {
      supabase.removeChannel(reactionsSubscriptionRef.current);
      reactionsSubscriptionRef.current = null;
    }

    // Subscribe to new message inserts for messages table (all channels, we filter by channel on payload)
    const msgChan = supabase
      .channel(`public:messages`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;
          // only include messages for the current channel
          if (String(newMsg.channel_id) !== String(channel.id)) return;
          // attach empty reactions (we will get reaction events separately)
          newMsg.reactions = [];
          setMessages((prev) => [newMsg, ...prev]);
          // if message not from current user, increment unread
          if (newMsg.username !== username) setUnviewedCount((c) => c + 1);
        }
      )
      .subscribe();

    messagesSubscriptionRef.current = msgChan;

    // Subscribe to reactions changes (INSERT and DELETE)
    const reactChan = supabase
      .channel(`public:reactions`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const r = payload.new;
          // only if the message is in our list (and in this channel)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === r.message_id ? { ...m, reactions: [...(m.reactions || []), { id: r.id, emoji: r.emoji, username: r.username }] } : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reactions" },
        (payload) => {
          const r = payload.old;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === r.message_id ? { ...m, reactions: (m.reactions || []).filter(x => x.id !== r.id) } : m
            )
          );
        }
      )
      .subscribe();

    reactionsSubscriptionRef.current = reactChan;
  }, [username]);

  // toggle reaction: insert if not exists, delete if exists
  const toggleReaction = useCallback(async ({ messageId, emoji }) => {
    if (!messageId || !emoji) return;
    try {
      // check existing
      const { data: existing, error: e1 } = await supabase
        .from("reactions")
        .select("*")
        .eq("message_id", messageId)
        .eq("emoji", emoji)
        .eq("username", username)
        .limit(1)
        .single();

      if (e1 && e1.code !== "PGRST116") {
        // PGRST116 is "No rows found" from single() — ignore
        // If other error, log
        if (e1) { /* ignore single() missing */ }
      }

      if (existing && existing.id) {
        // delete existing -> unreact
        await supabase.from("reactions").delete().eq("id", existing.id);
      } else {
        // insert
        await supabase.from("reactions").insert({
          message_id: messageId,
          emoji,
          username,
        });
      }
    } catch (err) {
      console.error("toggleReaction error", err);
    }
  }, [username]);

  // change channel (client-side)
  const selectChannel = useCallback(async (channel) => {
    if (!channel) return;
    setCurrentChannel(channel);
    setMessages([]);
    setUnviewedCount(0);
    // load channel messages and subscribe
    await loadMessagesForChannel(channel);
    subscribeRealtime(channel);
  }, [loadMessagesForChannel, subscribeRealtime]);

  // initial load
  useEffect(() => {
    (async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      await initializeUser(session);
      await getLocation();
      await fetchChannels();
    })();
    // cleanup on unmount
    return () => {
      if (messagesSubscriptionRef.current) supabase.removeChannel(messagesSubscriptionRef.current);
      if (reactionsSubscriptionRef.current) supabase.removeChannel(reactionsSubscriptionRef.current);
    };
  }, [initializeUser, getLocation, fetchChannels]);

  // when channels are loaded, pick first channel and load messages
  useEffect(() => {
    if (channels && channels.length && !currentChannel) {
      selectChannel(channels[0]);
    }
  }, [channels, currentChannel, selectChannel]);

  // scroll handler (exposed to UI)
  const onScroll = (e) => {
    const target = e.target;
    const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + SCROLL_THRESHOLD;
    setIsOnBottom(atBottom);
    if (atBottom) setUnviewedCount(0);

    // load older messages when scrollTop === 0
    if (target.scrollTop === 0 && currentChannel) {
      (async () => {
        try {
          const alreadyLoaded = messages.length;
          const { data } = await supabase
            .from("messages")
            .select("*")
            .eq("channel_id", currentChannel.id)
            .range(alreadyLoaded, alreadyLoaded + MESSAGES_PER_PAGE)
            .order("id", { ascending: false });
          if (data && data.length) {
            const withReacts = await attachReactionsToMessages(data);
            // append older to bottom of existing list (remember list is newest-first)
            setMessages((prev) => [...prev, ...withReacts]);
          }
        } catch (err) {
          console.error("load older messages", err);
        }
      })();
    }
  };

  // expose context
  return (
    <AppContext.Provider
      value={{
        // user
        username,
        setUsername,
        session,
        country,

        // channels
        channels,
        currentChannel,
        setCurrentChannel: selectChannel,
        fetchChannels,

        // messages
        messages, // newest-first
        loadingInitial,
        error,
        scrollRef,
        onScroll,
        scrollToBottom: () => {
          if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        },
        isOnBottom,
        unviewedCount,

        // typing/presence
        typingUsers,
        onlineUsers,

        // reactions
        toggleReaction,

        // refresh
        refreshMessages: () => currentChannel && loadMessagesForChannel(currentChannel),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);

export default AppContext;

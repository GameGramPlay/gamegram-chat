import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    // Reduce events per second to something reasonable for chat
    params: {
      eventsPerSecond: 15, // 5x lower than before
    },
    heartbeatIntervalMs: 20000, // ping server every 30s instead of 15s
    reconnectAfterMs: (tries) => Math.min(tries * 300, 3000), // slower reconnect
  },
  global: {
    headers: {
      'x-client-info': 'gamegram-chat',
    },
  },
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

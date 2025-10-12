import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AUTH_CONFIG } from "../constants/auth.config";

const SUPABASE_URL = AUTH_CONFIG.SUPABASE.URL;
const SUPABASE_KEY = AUTH_CONFIG.SUPABASE.ANON_KEY;

// Safe debug: confirm env presence (does not print actual values)
console.log(
  "🔧 Supabase env check:",
  JSON.stringify({ urlPresent: !!SUPABASE_URL, keyPresent: !!SUPABASE_KEY })
);

// Create a default/mock client if environment variables are missing
let supabase: any;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "⚠️ Supabase environment variables are missing. Using mock client."
  );
  // Create a mock client to prevent crashes
  supabase = {
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: new Error("Supabase not configured"),
      }),
      signOut: async () => ({ error: new Error("Supabase not configured") }),
      onAuthStateChange: () => ({ data: { subscription: null } }),
    },
    from: () => ({
      select: () => ({ data: [], error: new Error("Supabase not configured") }),
      insert: () => ({
        data: null,
        error: new Error("Supabase not configured"),
      }),
      update: () => ({
        data: null,
        error: new Error("Supabase not configured"),
      }),
      delete: () => ({
        data: null,
        error: new Error("Supabase not configured"),
      }),
    }),
  };
} else {
  // Centralized Supabase client (avoids circular deps)
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export { supabase };

console.log(
  "🔧 Supabase client created with AsyncStorage for session persistence"
);

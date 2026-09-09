import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Project credentials with robust fallback for static hosting deployments (e.g. Vercel)
const DEFAULT_SUPABASE_URL = 'https://pklepysfkqwpsjchouhb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_R4jFfPWlB-uWBAhS7uky1w_cznabRAJ';

const rawUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL.trim() : '';
const rawKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim() : '';

const supabaseUrl = rawUrl || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = rawKey || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
);

// Safe initialization that will never throw uncaught exception on bundle startup
let client: SupabaseClient;
try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
} catch (err) {
  console.warn('[supabaseClient] Failed to initialize Supabase client:', err);
  client = createClient('https://placeholder.supabase.co', 'placeholder', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

export const supabase = client;

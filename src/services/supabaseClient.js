import { createClient } from '@supabase/supabase-js';

// Load environment variables (exposed by Vite with VITE_ prefix)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Basic checks to avoid silent failures in production if variables are missing
if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Missing URL or public key. Check .env.local or Vercel variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

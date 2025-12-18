import { createClient } from '@supabase/supabase-js';

// Safely access Vite environment variables with a null check to prevent runtime errors
const metaEnv = (import.meta as any).env;
const supabaseUrl = metaEnv?.VITE_SUPABASE_URL || 'https://gvvqjzhxyeqjfduyusrl.supabase.co';
const supabaseAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AQpFsg-4SjCcH6S-3MJHwQ_3AIaT5RI';

if (!metaEnv?.VITE_SUPABASE_URL || !metaEnv?.VITE_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Environment variables missing or not loaded yet. Using defaults.', {
    hasUrl: !!metaEnv?.VITE_SUPABASE_URL,
    hasAnonKey: !!metaEnv?.VITE_SUPABASE_ANON_KEY,
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
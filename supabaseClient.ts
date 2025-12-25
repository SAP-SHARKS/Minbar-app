import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials to prevent environment variable resolution issues.
// This directly resolves the 'SUPABASE URL: undefined' errors reported in logs.
const supabaseUrl = 'https://gvvqjzhxyeqjfduyusrl.supabase.co';
const supabaseAnonKey = 'sb_publishable_AQpFsg-4SjCcH6S-3MJHwQ_3AIaT5RI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials to ensure stable connectivity and bypass environment variable resets.
// This restores the "heartbeat" of the app and fixes the [ENV] URL undefined errors.
const supabaseUrl = 'https://gvvqjzhxyeqjfduyusrl.supabase.co';
const supabaseAnonKey = 'sb_publishable_AQpFsg-4SjCcH6S-3MJHwQ_3AIaT5RI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials for sandbox stability
const supabaseUrl = 'https://gvvqjzhxyeqjfduyusrl.supabase.co';
const supabaseAnonKey = 'sb_publishable_AQpFsg-4SjCcH6S-3MJHwQ_3AIaT5RI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
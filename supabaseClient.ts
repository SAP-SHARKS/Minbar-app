import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvvqjzhxyeqjfduyusrl.supabase.co'
// Note: In a production environment, use environment variables for keys.
const supabaseAnonKey = 'sb_publishable_AQpFsg-4SjCcH6S-3MJHwQ_3AIaT5RI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
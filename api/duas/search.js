
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type } = req.query; // 'opening', 'closing', or 'dua'
  if (!type) return res.status(400).json({ error: 'Type required' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'LOGIN_REQUIRED' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return res.status(401).json({ error: 'LOGIN_REQUIRED' });

  try {
    const { data, error } = await supabase
      .from('khutbah_duas')
      .select('*')
      .eq('type', type)
      .order('id', { ascending: true });

    if (error) throw error;

    const results = data.map(d => ({
      id: d.id,
      title: d.title_english,
      arabic: d.arabic_text,
      english: d.english_translation,
      category: d.category || type,
      reference: d.category || type,
      type: type
    }));

    return res.status(200).json({ results });
  } catch (error) {
    console.error('[API/Duas-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

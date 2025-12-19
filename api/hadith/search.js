
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  // Auth Gate
  const sbUrl = process.env.SUPABASE_URL;
  const sbAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(sbUrl, sbAnonKey);
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED' });
  }

  try {
    const apiKey = process.env.HADITHAPI;
    if (!apiKey) throw new Error('Hadith API key not configured');

    const searchUrl = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&hadithEnglish=${encodeURIComponent(q)}&paginate=10`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error(`HadithAPI error: ${response.status}`);

    const data = await response.json();
    const hadiths = data.hadiths?.data || [];

    const results = hadiths.map(h => ({
      arabic: h.hadithArabic || "",
      english: (h.hadithEnglish || "").replace(/<[^>]*>/g, ""),
      book: h.bookName || "",
      chapter: h.chapterName || "",
      hadithNumber: h.hadithNumber || "",
      reference: `${h.bookName} #${h.hadithNumber}`
    }));

    return res.status(200).json({ results });

  } catch (error) {
    console.error('[API/Hadith-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

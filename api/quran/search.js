
import { createClient } from '@supabase/supabase-js';
import { getQFAccessToken, getQFBaseUrl } from '../../lib/quranFoundationAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  // 1. Verify Supabase Session (Auth Gate)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED', message: "Please sign in to search Quran verses." });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED', message: "Please sign in to search Quran verses." });
  }

  try {
    // 2. Get QF OAuth Token
    const token = await getQFAccessToken();
    const baseUrl = getQFBaseUrl();
    const clientId = process.env.QURAN_CLIENT_ID_PROD;

    // 3. Call QF Search API with translation 131 (The Clear Quran)
    const searchUrl = `${baseUrl}/content/api/v4/search?q=${encodeURIComponent(q)}&size=10&page=1&language=en&translations=131`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'x-auth-token': token,
        'x-client-id': clientId,
        'Accept': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'LOGIN_REQUIRED', message: "Access denied by Quran Foundation. Please sign in again." });
    }

    if (!response.ok) throw new Error(`QF API Error: ${response.status}`);

    const searchData = await response.json();
    const searchResults = searchData.search?.results || [];

    // 4. Transform results to normalized UI shape
    const results = searchResults.map(r => ({
      verseKey: r.verse_key,
      arabic: r.text || r.words?.map(w => w.text).join(' ') || '',
      english: (r.translations?.[0]?.text || "Translation unavailable").replace(/<[^>]*>/g, ""),
      reference: `Quran ${r.verse_key}`
    }));

    return res.status(200).json({ results });

  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

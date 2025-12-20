import { createClient } from '@supabase/supabase-js';
import { getQFAccessToken, getQFBaseUrl } from '../../lib/quranFoundationAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

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
    const token = await getQFAccessToken();
    const baseUrl = getQFBaseUrl();
    const clientId = process.env.QURAN_CLIENT_ID_PROD;

    // Use translation 131 (The Clear Quran) and limit size to 20 to allow for better local sorting
    const searchUrl = `${baseUrl}/content/api/v4/search?q=${encodeURIComponent(q)}&size=20&page=1&language=en&translations=131`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'x-auth-token': token,
        'x-client-id': clientId,
        'Accept': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      return res.status(401).json({ error: 'LOGIN_REQUIRED', message: "Access denied by Quran Foundation." });
    }

    if (!response.ok) throw new Error(`QF API Error: ${response.status}`);

    const searchData = await response.json();
    const searchResults = searchData.search?.results || [];

    const searchTerms = q.trim().toLowerCase().split(/\s+/);
    const hasArabicQuery = /[\u0600-\u06FF]/.test(q);

    const scoredResults = searchResults.map(r => {
      const arabic = (r.text || "").toLowerCase();
      const english = (r.translations?.[0]?.text || "").replace(/<[^>]*>/g, "").toLowerCase();
      
      let score = 10;

      // Tier 1: Exact Arabic Match
      if (hasArabicQuery && arabic.includes(q.trim().toLowerCase())) {
        score = 1;
      }
      // Tier 2: Exact English Phrase Match
      else if (english.includes(q.trim().toLowerCase())) {
        score = 2;
      }
      // Tier 3: All keywords present
      else {
        const allEnglishMatch = searchTerms.every(t => english.includes(t));
        const allArabicMatch = searchTerms.every(t => arabic.includes(t));
        if (allEnglishMatch || allArabicMatch) {
          score = 3;
        }
      }

      return {
        verseKey: r.verse_key,
        arabic: r.text || r.words?.map(w => w.text).join(' ') || '',
        english: (r.translations?.[0]?.text || "Translation unavailable").replace(/<[^>]*>/g, ""),
        reference: `Quran ${r.verse_key}`,
        surah_id: r.verse_key.split(':')[0],
        surah_name: r.surah_name_en || `Surah ${r.verse_key.split(':')[0]}`,
        relevance: score
      };
    });

    // Sort by relevance score ascending
    const sortedResults = scoredResults.sort((a, b) => a.relevance - b.relevance);

    return res.status(200).json({ results: sortedResults });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


import { createClient } from '@supabase/supabase-js';
import { getQFAccessToken, getQFBaseUrl } from '../../lib/quranFoundationAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  // 1. Verify Supabase Session
  const sbUrl = process.env.SUPABASE_URL;
  const sbAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(sbUrl, sbAnonKey);
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  try {
    const token = await getQFAccessToken();
    const baseUrl = getQFBaseUrl();
    const clientId = process.env.QF_CLIENT_ID;

    // 2. Call QF Search API
    const searchUrl = `${baseUrl}/content/api/v4/search?q=${encodeURIComponent(q)}&size=10&page=1&language=en&translations=131`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'x-auth-token': token,
        'x-client-id': clientId,
        'Accept': 'application/json'
      }
    });

    if (response.status === 403) {
      return res.status(503).json({ 
        error: "QF_FORBIDDEN", 
        details: "Access denied by Quran Foundation",
        hint: "Verify client ID and secret scopes."
      });
    }

    if (response.status === 429) {
      return res.status(429).json({ error: "QF_RATE_LIMIT" });
    }

    if (!response.ok) throw new Error(`QF Search Error: ${response.status}`);

    const searchData = await response.json();
    const searchResults = searchData.search?.results || [];

    // 3. Transform to UI shape
    // QF search result has 'text' which is usually the translation snippet
    // We try to pull the specific translation from the translations array
    const results = searchResults.map(r => ({
      verseKey: r.verse_key,
      arabic: r.words?.map(w => w.text).join(' ') || '', // Simple fallback for Arabic if not top level
      english: (r.translations?.[0]?.text || r.text || "Translation unavailable").replace(/<[^>]*>/g, ""),
      reference: `Quran ${r.verse_key}`
    }));

    // If Arabic is missing from search snippet, we return the verse key and let frontend fetch detail or use snippet
    return res.status(200).json({ results });

  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

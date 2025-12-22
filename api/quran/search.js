import { getQFAccessToken, getQFBaseUrl } from '../../lib/quranFoundationAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  try {
    const token = await getQFAccessToken();
    const baseUrl = getQFBaseUrl();
    const clientId = process.env.QURAN_CLIENT_ID_PROD;

    // Use translation 131 (The Clear Quran)
    // Fetch a larger pool to allow for high-quality tiered sorting
    const searchUrl = `${baseUrl}/content/api/v4/search?q=${encodeURIComponent(q)}&size=50&page=1&language=en&translations=131`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'x-auth-token': token,
        'x-client-id': clientId,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`QF API Error: ${response.status}`);

    const searchData = await response.json();
    const searchResults = searchData.search?.results || [];

    const query = q.trim().toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    const hasArabicQuery = /[\u0600-\u06FF]/.test(q);

    const scoredResults = searchResults.map(r => {
      const arabic = (r.text || "").toLowerCase();
      const english = (r.translations?.[0]?.text || "").replace(/<[^>]*>/g, "").toLowerCase();
      
      let score = 10;

      // Tier 1: Exact Arabic text matches (if an Arabic query was used)
      if (hasArabicQuery && arabic.includes(query)) {
        score = 1;
      }
      // Tier 2: Exact English phrase matches within the translation
      else if (english.includes(query)) {
        score = 2;
      }
      // Tier 3: Keyword relevance (contains all words in the search query)
      else {
        const matchesAllWords = queryWords.every(word => english.includes(word) || arabic.includes(word));
        if (matchesAllWords) {
          score = 3;
        } else {
          score = 5; // Partial match
        }
      }

      return {
        verseKey: r.verse_key,
        arabic: r.text || '',
        english: (r.translations?.[0]?.text || "Translation unavailable").replace(/<[^>]*>/g, ""),
        reference: `Quran ${r.verse_key}`,
        surah_id: r.verse_key.split(':')[0],
        surah_name: r.surah_name_en || `Surah ${r.verse_key.split(':')[0]}`,
        relevance: score
      };
    });

    // Sort by relevance score ascending (1 is best), then by traditional verse order
    const sortedResults = scoredResults.sort((a, b) => {
      if (a.relevance !== b.relevance) return a.relevance - b.relevance;
      const [aS, aV] = a.verseKey.split(':').map(Number);
      const [bS, bV] = b.verseKey.split(':').map(Number);
      return aS !== bS ? aS - bS : aV - bV;
    });

    return res.status(200).json({ results: sortedResults.slice(0, 20) });

  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
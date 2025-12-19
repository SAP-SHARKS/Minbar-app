
/**
 * Server-side proxy for Quran.com Search API v4
 * Enhanced to fetch Arabic text for premium preview cards
 */
export default async function handler(req, res) {
  const { q, page = 1, size = 10, language = 'en' } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Query string must be at least 2 characters long." });
  }

  const QURAN_API_BASE = 'https://api.quran.com/api/v4';
  const searchUrl = `${QURAN_API_BASE}/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}&language=${language}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'x-client-id': process.env.QF_CLIENT_ID || 'minbar-ai-guest'
      }
    });

    if (response.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait." });
    }

    if (!response.ok) throw new Error(`Quran API search failed: ${response.status}`);

    const searchData = await response.json();
    const results = searchData.search.results;

    // Fetch Arabic (Indopak) for the top results to show in preview cards
    const resultsWithArabic = await Promise.all(results.map(async (r) => {
      try {
        const arabicRes = await fetch(`${QURAN_API_BASE}/quran/verses/indopak?verse_key=${r.verse_key}`);
        const arabicData = await arabicRes.json();
        return {
          verseKey: r.verse_key,
          english: r.text.replace(/<[^>]*>/g, ''), // Search snippet is the English translation
          arabic: arabicData.verses?.[0]?.text_indopak || '',
          reference: `Quran ${r.verse_key}`
        };
      } catch (e) {
        return {
          verseKey: r.verse_key,
          english: r.text.replace(/<[^>]*>/g, ''),
          reference: `Quran ${r.verse_key}`
        };
      }
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ results: resultsWithArabic });

  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: "Search failed", details: error.message });
  }
}

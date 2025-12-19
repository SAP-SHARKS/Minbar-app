
/**
 * Server-side proxy for Quran.com Search API v4
 * Handles requests to: GET https://api.quran.com/api/v4/search
 */
export default async function handler(req, res) {
  const { q, page = 1, size = 20, language = 'en' } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Query string must be at least 2 characters long." });
  }

  const QURAN_API_BASE = 'https://api.quran.com/api/v4';
  const url = `${QURAN_API_BASE}/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}&language=${language}`;

  console.log(`[API/Quran-Search] Proxying request: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        // If you have QF headers, add them here
        'x-client-id': process.env.QF_CLIENT_ID || 'minbar-ai-guest'
      }
    });

    if (response.status === 429) {
      return res.status(429).json({ error: "Quran API rate limit exceeded. Please wait a moment." });
    }

    if (!response.ok) {
      throw new Error(`Quran API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Format results for a cleaner frontend consumption
    const results = data.search.results.map(r => ({
      verseKey: r.verse_key,
      text: r.text.replace(/<[^>]*>/g, ''), // Clean translation snippet
      reference: `Quran ${r.verse_key}`
    }));

    // Cache control to prevent redundant hits during preview
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ results, totalResults: data.search.total_results });

  } catch (error) {
    console.error('[API/Quran-Search] Proxy error:', error);
    return res.status(500).json({ 
      error: "Failed to fetch results from Quran.com",
      details: error.message 
    });
  }
}

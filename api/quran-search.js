
/**
 * Server-side proxy for Quran.com Search API v4
 * Fixes: Correctly maps English translation and Arabic text for results.
 */
export default async function handler(req, res) {
  const { q, page = 1, size = 5, language = 'en' } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Query string must be at least 2 characters long." });
  }

  const QURAN_API_BASE = 'https://api.quran.com/api/v4';
  const searchUrl = `${QURAN_API_BASE}/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}&language=${language}`;

  try {
    const response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait." });
    }

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);

    const searchData = await response.json();
    const searchResults = searchData.search.results;

    // For each result, fetch clean Arabic + specific English translation (131 = Sahih International)
    const results = await Promise.all(searchResults.map(async (r) => {
      try {
        const detailRes = await fetch(
          `${QURAN_API_BASE}/verses/by_key/${r.verse_key}?language=en&words=false&translations=131&fields=text_uthmani`
        );
        const details = await detailRes.json();
        const verse = details?.verse;

        return {
          verseKey: r.verse_key,
          arabic: verse?.text_uthmani || "",
          english: (verse?.translations?.[0]?.text || "").replace(/<[^>]*>/g, ""),
          reference: `Quran ${r.verse_key}`
        };
      } catch (e) {
        // Fallback to original search result data if detail fetch fails
        return {
          verseKey: r.verse_key,
          arabic: "", 
          english: r.text.replace(/<[^>]*>/g, ""),
          reference: `Quran ${r.verse_key}`
        };
      }
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ results });

  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: "Search failed", details: error.message });
  }
}

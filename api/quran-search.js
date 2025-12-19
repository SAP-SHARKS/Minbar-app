
/**
 * Server-side proxy for Quran Foundation Search API v4
 */
export default async function handler(req, res) {
  const { q, size = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Query string must be at least 2 characters long." });
  }

  // Use the correct Quran Foundation endpoint
  const QF_SEARCH_API = 'https://apis.quran.foundation/v4/search';
  const searchUrl = `${QF_SEARCH_API}?q=${encodeURIComponent(q)}&language=en&translations=20&size=${size}`;

  try {
    console.log(`[API/Quran-Search] Requesting: ${searchUrl}`);
    const response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait." });
    }

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);

    const searchData = await response.json();
    const searchResults = searchData.search?.results || [];

    // Map results according to specified logic
    // Arabic: result.text
    // English: result.translations[0].text
    const results = searchResults.map((r) => {
      const arabic = r.text || "";
      const english = (r.translations?.[0]?.text || "Translation unavailable").replace(/<[^>]*>/g, "");
      
      return {
        verseKey: r.verse_key,
        arabic: arabic,
        english: english,
        reference: `Quran ${r.verse_key}`
      };
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ results });

  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: "Search failed", details: error.message });
  }
}

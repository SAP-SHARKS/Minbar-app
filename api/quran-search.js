
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
    const searchResults = searchData.search.results || [];

    // Map each result to a full verse fetch to get clean Arabic + Specific Translation
    const results = await Promise.all(searchResults.map(async (r) => {
      try {
        const verseKey = r.verse_key;
        // Fetch detailed verse info including Sahih International translation (ID 131)
        const detailUrl = `${QURAN_API_BASE}/verses/by_key/${verseKey}?language=en&words=false&translations=131&fields=text_uthmani`;
        const detailRes = await fetch(detailUrl);
        
        if (!detailRes.ok) throw new Error(`Failed to fetch details for ${verseKey}`);
        
        const details = await detailRes.json();
        const verse = details?.verse;

        // DEBUG: Server-side log for validation
        console.log(`[QuranSearch] Verse: ${verseKey}, Has Translation: ${!!verse?.translations?.[0]?.text}`);

        return {
          verseKey: verseKey,
          arabic: verse?.text_uthmani || "",
          english: (verse?.translations?.[0]?.text || "Translation unavailable").replace(/<[^>]*>/g, ""),
          reference: `Quran ${verseKey}`
        };
      } catch (e) {
        console.warn(`[QuranSearch] Mapping fallback for ${r.verse_key}:`, e.message);
        return {
          verseKey: r.verse_key,
          arabic: "", 
          english: r.text.replace(/<[^>]*>/g, ""), // Use search snippet as fallback
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

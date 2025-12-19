
/**
 * Server-side proxy for Quran.com Verse API v4
 */
export default async function handler(req, res) {
  const { key } = req.query;

  if (!key || !/^\d{1,3}:\d{1,3}$/.test(key)) {
    return res.status(400).json({ error: "Valid verse key required (e.g., 2:255)" });
  }

  const QURAN_API_BASE = 'https://api.quran.com/api/v4';
  
  try {
    console.log(`[API/Quran-Verse] Fetching details for ${key}`);

    // We fetch Arabic (Indopak) and translation (Clear Quran = 131)
    const [arabicRes, transRes] = await Promise.all([
      fetch(`${QURAN_API_BASE}/quran/verses/indopak?verse_key=${key}`),
      fetch(`${QURAN_API_BASE}/quran/translations/131?verse_key=${key}`)
    ]);

    const arabicData = await arabicRes.json();
    const transData = await transRes.json();

    const result = {
      verseKey: key,
      arabic: arabicData.verses?.[0]?.text_indopak || '',
      translation: transData.translations?.[0]?.text.replace(/<[^>]*>/g, '') || '',
      reference: `Quran ${key}`,
      source: 'quran.com'
    };

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(result);

  } catch (error) {
    console.error('[API/Quran-Verse] Proxy error:', error);
    return res.status(500).json({ error: "Failed to fetch verse details", details: error.message });
  }
}

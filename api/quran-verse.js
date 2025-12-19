
/**
 * Server-side proxy for Quran Foundation Verse API v4
 */
export default async function handler(req, res) {
  const { key } = req.query;

  if (!key || !/^\d{1,3}:\d{1,3}$/.test(key)) {
    return res.status(400).json({ error: "Valid verse key required (e.g., 2:255)" });
  }

  const QF_API_BASE = 'https://apis.quran.foundation/v4';
  
  try {
    // Fetch Arabic (Uthmani) and translation (ID 20)
    // Using apis.quran.foundation consistently
    const [arabicRes, transRes] = await Promise.all([
      fetch(`${QF_API_BASE}/quran/verses/uthmani?verse_key=${key}`),
      fetch(`${QF_API_BASE}/quran/translations/20?verse_key=${key}`)
    ]);

    if (!arabicRes.ok || !transRes.ok) {
        throw new Error("Failed to fetch verse from Quran Foundation");
    }

    const arabicData = await arabicRes.json();
    const transData = await transRes.json();

    const result = {
      verseKey: key,
      arabic: arabicData.verses?.[0]?.text_uthmani || '',
      english: (transData.translations?.[0]?.text || '').replace(/<[^>]*>/g, ''),
      reference: `Quran ${key}`,
      source: 'quran.foundation'
    };

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(result);

  } catch (error) {
    console.error('[API/Quran-Verse] Proxy error:', error);
    return res.status(500).json({ error: "Failed to fetch verse details", details: error.message });
  }
}

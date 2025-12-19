
import { fetchWithAuth } from '../../lib/quranService';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const baseUrl = process.env.QF_API_BASE_URL || 'https://api.quran.com/api/v4';

  try {
    // 1. Search for verse matches
    const searchData = await fetchWithAuth(`${baseUrl}/search?q=${encodeURIComponent(q)}&size=10&language=en`);
    
    // 2. Format results for frontend
    // Note: Standard Quran.com search returns verse_key, we need to fetch specific verse details if not included
    const results = searchData.search.results.map(r => ({
      verseKey: r.verse_key,
      text: r.text, // usually translation highlight
      reference: `Quran ${r.verse_key}`
    }));

    return res.status(200).json({ results });
  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

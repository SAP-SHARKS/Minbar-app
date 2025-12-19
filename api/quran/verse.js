
import { fetchWithAuth } from '../../lib/quranService';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Verse key required (e.g. 2:255)' });

  const baseUrl = process.env.QF_API_BASE_URL || 'https://api.quran.com/api/v4';

  try {
    // Fetch Arabic (Indopak script usually preferred for khutbahs) and specific translation (131 = Clear Quran)
    const [arabicRes, transRes] = await Promise.all([
      fetchWithAuth(`${baseUrl}/quran/verses/indopak?verse_key=${key}`),
      fetchWithAuth(`${baseUrl}/quran/translations/131?verse_key=${key}`)
    ]);

    const result = {
      verseKey: key,
      arabic: arabicRes.verses[0]?.text_indopak || '',
      translation: transRes.translations[0]?.text.replace(/<[^>]*>/g, '') || '', // Strip html tags from translation
      reference: `Quran ${key}`
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('[API/Quran-Verse] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

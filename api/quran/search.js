
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q, surah } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED', message: "Please sign in to search Quran verses." });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED', message: "Please sign in to search Quran verses." });
  }

  try {
    const searchTerms = q.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const exactPhrase = q.trim().toLowerCase();

    // Start building the query
    let query = supabase
      .from('quran_verses')
      .select('surah_number, ayah_number, arabic_text, english_translation, surah_name_english');

    if (surah) {
      query = query.eq('surah_number', surah);
    }

    // Combine filters for broad matching
    // We fetch a larger pool to score them in memory for true relevance ranking
    const filters = [];
    searchTerms.forEach(term => {
      filters.push(`arabic_text.ilike.%${term}%`);
      filters.push(`english_translation.ilike.%${term}%`);
    });
    
    query = query.or(filters.join(','));
    query = query.limit(100);

    const { data: verses, error: dbError } = await query;

    if (dbError) throw dbError;
    if (!verses) return res.status(200).json({ results: [] });

    // Relevance Scoring Logic
    const scoredResults = verses.map(v => {
      const arabic = v.arabic_text || '';
      const english = (v.english_translation || '').toLowerCase();
      let score = 10; // Default low relevance

      // 1. Exact Arabic word match
      const hasExactArabic = searchTerms.some(term => 
        /[\u0600-\u06FF]/.test(term) && arabic.includes(term)
      );
      if (hasExactArabic) score = Math.min(score, 1);

      // 2. Exact English phrase match
      if (english.includes(exactPhrase)) score = Math.min(score, 2);

      // 3. All words present in Arabic
      const allWordsInArabic = searchTerms.every(term => arabic.includes(term));
      if (allWordsInArabic && searchTerms.length > 1) score = Math.min(score, 3);

      // 4. All words present in English
      const allWordsInEnglish = searchTerms.every(term => english.includes(term));
      if (allWordsInEnglish && searchTerms.length > 1) score = Math.min(score, 4);

      // 5. Any single word match (already covered by initial fetch, default score 5 if not higher)
      if (score === 10) score = 5;

      return {
        ...v,
        relevance_score: score
      };
    });

    // Sort by relevance score, then surah/ayah
    const sorted = scoredResults.sort((a, b) => {
      if (a.relevance_score !== b.relevance_score) return a.relevance_score - b.relevance_score;
      if (a.surah_number !== b.surah_number) return a.surah_number - b.surah_number;
      return a.ayah_number - b.ayah_number;
    });

    // Format for frontend
    const results = sorted.slice(0, 20).map(r => ({
      verseKey: `${r.surah_number}:${r.ayah_number}`,
      arabic: r.arabic_text,
      english: r.english_translation,
      reference: `Surah ${r.surah_name_english} ${r.surah_number}:${r.ayah_number}`,
      relevance: r.relevance_score
    }));

    return res.status(200).json({ results });

  } catch (error) {
    console.error('[API/Quran-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}


import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q, book, status, paginate = 20, page = 1 } = req.query;
  
  // Auth Gate
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return res.status(401).json({ error: 'LOGIN_REQUIRED' });
  }

  try {
    const apiKey = process.env.HADITH_API_KEY || process.env.HADITHAPI;
    if (!apiKey) throw new Error('Hadith API key not configured');

    const params = new URLSearchParams({
      apiKey,
      paginate: paginate.toString(),
      page: page.toString()
    });

    if (q) params.append('hadithEnglish', q);
    if (book) params.append('book', book);
    if (status) params.append('status', status);

    const searchUrl = `https://hadithapi.com/api/hadiths/?${params.toString()}`;
    const response = await fetch(searchUrl);
    
    if (response.status === 404) {
      return res.status(200).json({ results: [], total: 0 });
    }

    if (!response.ok) {
        throw new Error(`HadithAPI error: ${response.status}`);
    }

    const data = await response.json();
    const hadiths = data.hadiths?.data || [];
    const totalCount = data.hadiths?.total || 0;

    const results = hadiths.map(h => {
      const englishText = (h.hadithEnglish || "").replace(/<[^>]*>/g, "");
      const wordCount = englishText.split(/\s+/).length;
      let lengthAttr = 'Medium';
      if (wordCount < 30) lengthAttr = 'Short';
      else if (wordCount > 100) lengthAttr = 'Long';

      return {
        id: h.id?.toString(),
        arabic: h.hadithArabic || "",
        english: englishText,
        book: h.book?.bookName || "Unknown Source",
        bookSlug: h.bookSlug,
        hadithNumber: h.hadithNumber || "N/A",
        status: h.status || "Unknown",
        length: lengthAttr,
        reference: `${h.book?.bookName || "Hadith"} #${h.hadithNumber}`
      };
    });

    return res.status(200).json({ 
      results, 
      total: totalCount,
      currentPage: data.hadiths?.current_page || 1,
      lastPage: data.hadiths?.last_page || 1
    });

  } catch (error) {
    console.error('[API/Hadith-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

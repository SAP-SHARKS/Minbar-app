
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  // Auth Gate - using Vercel server-side variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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
    // Support both HADITH_API_KEY (new request) and HADITHAPI (previous request)
    const apiKey = process.env.HADITH_API_KEY || process.env.HADITHAPI;
    if (!apiKey) throw new Error('Hadith API key not configured');

    // Correct endpoint with trailing slash as per documentation/request
    const searchUrl = `https://hadithapi.com/api/hadiths/?apiKey=${apiKey}&hadithEnglish=${encodeURIComponent(q)}&paginate=10`;
    
    console.log(`[API/Hadith-Search] Requesting: ${searchUrl.replace(apiKey, 'REDACTED')}`);
    
    const response = await fetch(searchUrl);
    
    // Handle 404 as "no results" rather than a critical error
    if (response.status === 404) {
      return res.status(200).json({ results: [] });
    }

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[API/Hadith-Search] Error ${response.status}:`, errText);
        throw new Error(`HadithAPI error: ${response.status}`);
    }

    const data = await response.json();
    // The API structure for /hadiths/ usually returns { hadiths: { data: [...] } }
    const hadiths = data.hadiths?.data || [];

    const results = hadiths.map(h => {
      // Data Mapping from hadithapi.com structure
      const englishText = (h.hadithEnglish || "").replace(/<[^>]*>/g, "");
      const arabicText = h.hadithArabic || "";
      const bookName = h.book?.bookName || "Unknown Source";
      const hNumber = h.hadithNumber || "N/A";
      const status = h.status || "";
      
      return {
        arabic: arabicText,
        english: englishText,
        book: bookName,
        hadithNumber: hNumber,
        // Reference includes book name, number, and status (e.g. Sahih)
        reference: `${bookName} #${hNumber}${status ? ` (${status})` : ''}`
      };
    });

    return res.status(200).json({ results });

  } catch (error) {
    console.error('[API/Hadith-Search] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

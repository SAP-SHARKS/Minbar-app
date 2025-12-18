import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  // Log presence of keys (boolean only) for diagnostics
  console.log('[API/Process] Request received. Environment check:', {
    hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
    hasSbUrl: !!process.env.SUPABASE_URL,
    hasSbServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasSbAnonKey: !!process.env.SUPABASE_ANON_KEY,
    // Explicitly check for incorrect VITE_ vars
    usingViteUrl: !!process.env.VITE_SUPABASE_URL,
    usingViteKey: !!process.env.VITE_SUPABASE_ANON_KEY
  });

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content, type, khutbahId, fileUrl } = req.body;

    if (!content) {
      console.error('[API/Process] Missing content in request body');
      return res.status(400).json({ error: 'No content provided for processing' });
    }

    // Server-side Environment Variables (NOT VITE_ prefixed)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const sbUrl = process.env.SUPABASE_URL;
    // Prefer Service Role key for server-side updates
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!geminiKey) throw new Error('Missing GEMINI_API_KEY server environment variable');
    if (!sbUrl) throw new Error('Missing SUPABASE_URL server environment variable');
    if (!sbKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY server environment variable');

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const supabase = createClient(sbUrl, sbKey);

    let prompt;
    let config = {};

    if (type === 'format') {
      console.log('[API/Process] Mode: Format HTML');
      prompt = `Convert this khutbah into clean, professional HTML.
      Rules:
      - Use <h1> for Title
      - Use <h2> for Sections
      - Use <p> for body text
      - Use <p class="arabic" dir="rtl"> for Arabic text
      - Use <blockquote class="quran"> for Quran verses
      - Use <blockquote class="hadith"> for Hadith
      Return ONLY the HTML content, no markdown code blocks.
      
      CONTENT: ${content}`;
    } else if (type === 'cards') {
      console.log('[API/Process] Mode: Generate Cards');
      prompt = `Create a structured summary of the following khutbah as a JSON array of cards.
      Each object: { card_number, section_label (INTRO/MAIN/HADITH/QURAN/STORY/PRACTICAL/CLOSING), title, bullet_points (array), arabic_text, key_quote, quote_source, time_estimate_seconds }
      Return ONLY valid JSON.
      
      KHUTBAH: ${content}`;
      config = { responseMimeType: 'application/json' };
    } else {
      throw new Error(`Invalid process type: ${type}`);
    }

    console.log('[API/Process] Sending to Gemini (gemini-3-flash-preview)...');
    const geminiStart = Date.now();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config
    });

    const geminiEnd = Date.now();
    console.log(`[API/Process] Gemini latency: ${geminiEnd - geminiStart}ms`);

    const resultText = response.text;
    if (!resultText) throw new Error('Gemini returned empty text');

    // Server-side database persistence
    if (khutbahId && khutbahId !== 'mock_id') {
      console.log(`[API/Process] Step: Database update start for ID: ${khutbahId}`);
      const dbStart = Date.now();

      if (type === 'format') {
        const { error: upErr } = await supabase
          .from('khutbahs')
          .update({ 
            content: resultText, 
            extracted_text: resultText,
            updated_at: new Date().toISOString() 
          })
          .eq('id', khutbahId);
        if (upErr) throw new Error(`Supabase Update Error: ${upErr.message}`);
      } else if (type === 'cards') {
        let cards = [];
        try {
          const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          cards = JSON.parse(cleanJson);
        } catch (e) {
          cards = JSON.parse(resultText);
        }

        await supabase.from('khutbah_cards').delete().eq('khutbah_id', khutbahId);
        const cardsWithId = cards.map(c => ({ ...c, khutbah_id: khutbahId }));
        const { error: insErr } = await supabase.from('khutbah_cards').insert(cardsWithId);
        if (insErr) throw new Error(`Supabase Insert Error: ${insErr.message}`);
      }

      console.log(`[API/Process] Database latency: ${Date.now() - dbStart}ms`);
    }

    console.log(`[API/Process] Request success in ${Date.now() - startTime}ms`);
    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error('[API/Process] CRITICAL ERROR:', error);
    return res.status(500).json({
      error: error.message || 'Internal Server Error',
      stack: error.stack,
      step: 'server-side-process-handler'
    });
  }
}
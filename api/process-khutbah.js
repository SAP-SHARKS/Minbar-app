import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  // Log presence of keys for diagnostics without exposing them
  console.log('[API/Process] Environment check:', {
    hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
    hasSbUrl: !!process.env.SUPABASE_URL,
    hasSbServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content, type, khutbahId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'No content provided for processing' });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const sbUrl = process.env.SUPABASE_URL;
    // Prefer Service Role key to bypass RLS restrictions during batch jobs
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!geminiKey || !sbUrl || !sbKey) {
        throw new Error('Server-side API keys are not fully configured in environment.');
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const supabase = createClient(sbUrl, sbKey);

    let prompt;
    let config = {};

    if (type === 'format') {
      prompt = `Convert this raw transcript into professional, clean HTML for a sermon document.
      Rules:
      - Use <h1> for Title
      - Use <h2> for major sections
      - Use <p> for paragraphs
      - Use <p class="arabic" dir="rtl"> for all Arabic text
      - Use <blockquote class="quran"> for Quranic verses
      - Use <blockquote class="hadith"> for Prophetic narrations
      Return ONLY the HTML body content string. No markdown fences.
      
      RAW CONTENT: ${content}`;
    } else if (type === 'cards') {
      prompt = `Based on the following khutbah HTML, create a list of summary presentation cards.
      Return a JSON array of objects with these fields:
      - card_number (integer)
      - section_label (INTRO/MAIN/HADITH/QURAN/STORY/PRACTICAL/CLOSING)
      - title (string)
      - bullet_points (array of strings, 3-5 points)
      - arabic_text (string, important verse/hadith in Arabic if any)
      - key_quote (string, translation)
      - quote_source (string, Surah/Book)
      - time_estimate_seconds (integer, 120-300)
      
      Return ONLY raw JSON, no markdown.
      
      HTML CONTENT: ${content}`;
      config = { 
        responseMimeType: 'application/json'
      };
    } else {
      throw new Error(`Invalid process type: ${type}`);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config
    });

    const resultText = response.text;
    if (!resultText) throw new Error('AI processing returned an empty result');

    // Persist to Database automatically if ID is provided
    if (khutbahId) {
      if (type === 'format') {
        const { error: dbErr } = await supabase
          .from('khutbahs')
          .update({ 
            content: resultText, 
            extracted_text: resultText,
            updated_at: new Date().toISOString() 
          })
          .eq('id', khutbahId);
        if (dbErr) throw new Error(`Database Update Failed: ${dbErr.message}`);
      } else if (type === 'cards') {
        let cards = [];
        try {
          // Robust JSON parsing for Gemini outputs
          const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          cards = JSON.parse(cleanJson);
        } catch (e) {
          console.warn('[API/Process] JSON parse failed, trying direct text', e);
          cards = JSON.parse(resultText);
        }

        // Batch delete and insert to ensure cards are fresh
        await supabase.from('khutbah_cards').delete().eq('khutbah_id', khutbahId);
        const cardsWithId = cards.map(c => ({ ...c, khutbah_id: khutbahId }));
        const { error: insErr } = await supabase.from('khutbah_cards').insert(cardsWithId);
        if (insErr) throw new Error(`Database Card Insertion Failed: ${insErr.message}`);
      }
    }

    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error('[API/Process] Critical Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal Server Error',
      step: 'api-process-handler'
    });
  }
}
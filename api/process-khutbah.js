import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log('[API/Process] Request received');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content, type, khutbahId, imamId, imamName, fileUrl } = req.body;

    if (!content) {
      console.error('[API/Process] Missing content');
      return res.status(400).json({ error: 'No content provided' });
    }

    console.log(`[API/Process] Step: Initialization. Type: ${type}, ID: ${khutbahId || 'new'}`);
    if (fileUrl) console.log(`[API/Process] Source File URL: ${fileUrl}`);

    // Auth & Clients
    const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_ANON_KEY;

    if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured');
    if (!sbUrl || !sbKey) throw new Error('Supabase environment variables are missing');

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const supabase = createClient(sbUrl, sbKey);

    let prompt;
    let config = {};

    if (type === 'format') {
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
      prompt = `Create a structured summary of the following khutbah as a JSON array of cards.
      Each object: { card_number, section_label (INTRO/MAIN/HADITH/QURAN/STORY/PRACTICAL/CLOSING), title, bullet_points (array), arabic_text, key_quote, quote_source, time_estimate_seconds }
      Return ONLY valid JSON.
      
      KHUTBAH: ${content}`;
      config = { responseMimeType: 'application/json' };
    } else {
      throw new Error(`Invalid process type: ${type}`);
    }

    console.log(`[API/Process] Step: Gemini Call Start. Prompt length: ${prompt.length}`);
    const geminiStart = Date.now();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config
    });

    const geminiEnd = Date.now();
    console.log(`[API/Process] Step: Gemini Call End. Latency: ${geminiEnd - geminiStart}ms`);

    const resultText = response.text;
    if (!resultText) throw new Error('Gemini returned an empty result');

    // Handle DB Update if ID is provided
    if (khutbahId && khutbahId !== 'mock_id') {
      console.log(`[API/Process] Step: Supabase Update Start. Table: ${type === 'cards' ? 'khutbah_cards' : 'khutbahs'}`);
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
        if (upErr) throw upErr;
      } else if (type === 'cards') {
        let cards = [];
        try {
          cards = JSON.parse(resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        } catch (e) {
          console.warn('[API/Process] JSON Parse failed, trying raw text');
          cards = JSON.parse(resultText);
        }

        await supabase.from('khutbah_cards').delete().eq('khutbah_id', khutbahId);
        const cardsWithId = cards.map(c => ({ ...c, khutbah_id: khutbahId }));
        const { error: insErr } = await supabase.from('khutbah_cards').insert(cardsWithId);
        if (insErr) throw insErr;
      }

      const dbEnd = Date.now();
      console.log(`[API/Process] Step: Supabase Update End. Latency: ${dbEnd - dbStart}ms`);
    }

    console.log(`[API/Process] Success. Total duration: ${Date.now() - startTime}ms`);
    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error('[API/Process] ERROR:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred during khutbah processing',
      stack: error.stack,
      step: 'server-side-processing'
    });
  }
}
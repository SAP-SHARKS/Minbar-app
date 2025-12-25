import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
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
    // CRITICAL: Use Service Role Key to bypass RLS and fix 403 Forbidden errors during batch admin jobs.
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!geminiKey || !sbUrl || !sbKey) {
        throw new Error('Server-side configuration (Supabase/Gemini) is incomplete.');
    }

    // Verify user authorization via header if provided (Optional secondary check)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const tempClient = createClient(sbUrl, process.env.SUPABASE_ANON_KEY);
        const { data: { user } } = await tempClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user?.email !== 'zaid.aiesec@gmail.com') {
            return res.status(403).json({ error: 'Unauthorized: Only zaid.aiesec@gmail.com can process these records.' });
        }
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const supabase = createClient(sbUrl, sbKey); // Using service key here to ensure save success

    let prompt;
    let config = {};

    if (type === 'format') {
      prompt = `Convert this raw khutbah transcript into RICH SEMANTIC HTML. 
      Mirror the original document's visual hierarchy and layout exactly.
      
      Formatting Rules:
      1. Subheadings: Identify all major section titles (e.g., 'Introduction', 'The Difference Between Then and Now'). 
         Render these using <h2> or <h3> tags. INSIDE the tag, the text MUST be wrapped in a <strong> tag.
         Example: <h2 class="text-3xl font-bold mt-12 mb-6 text-gray-900"><strong>The Difference Between Then and Now</strong></h2>

      2. Paragraphs & Spacing: Do NOT collapse line breaks. Every distinct paragraph must be wrapped in <p class="mb-6 text-gray-700 leading-relaxed text-lg">.
         Use <br /> for single line breaks within a thought block.

      3. Arabic & Quranic Text: Identify all Arabic script (Quranic verses, Hadith, Duas).
         Wrap it in a <div dir="rtl" class="bg-emerald-50 p-8 rounded-[2rem] my-8 font-serif text-3xl leading-[2.2] text-right border-r-8 border-emerald-400 shadow-sm shadow-emerald-100/50">.
         Ensure the Arabic font is prominent and readable.

      4. Emphasis: Use <strong> for any phrases or words that were emphasized or bolded in the source document.
      
      5. Output: Return ONLY the clean HTML body fragment. No markdown fences, no <html>, no <body> tags.
      
      RAW CONTENT:
      ${content}`;
    } else if (type === 'cards') {
      prompt = `Based on the following khutbah HTML, generate a sequence of structured presentation cards for Live Mode.
      Return a JSON array of objects with:
      - card_number (int)
      - section_label (INTRO/MAIN/HADITH/QURAN/STORY/PRACTICAL/CLOSING)
      - title (string)
      - bullet_points (string array)
      - arabic_text (string - if applicable)
      - key_quote (string - translation)
      - quote_source (string)
      - time_estimate_seconds (int)
      
      HTML CONTENT:
      ${content}`;
      config = { responseMimeType: 'application/json' };
    } else {
      throw new Error(`Invalid process type: ${type}`);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config
    });

    const resultText = response.text;
    if (!resultText) throw new Error('AI returned an empty response');

    // Persistence Logic
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
          const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          cards = JSON.parse(cleanJson);
        } catch (e) {
          cards = JSON.parse(resultText);
        }

        // Fresh insert for cards to ensure order and consistency
        await supabase.from('khutbah_cards').delete().eq('khutbah_id', khutbahId);
        const cardsWithId = cards.map(c => ({ ...c, khutbah_id: khutbahId }));
        const { error: insErr } = await supabase.from('khutbah_cards').insert(cardsWithId);
        
        if (insErr) throw new Error(`Card Insertion Failed: ${insErr.message}`);
      }
    }

    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error('[API/Process] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
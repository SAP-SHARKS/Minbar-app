
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
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!geminiKey || !sbUrl || !sbKey) {
        throw new Error('Server-side API keys are not fully configured.');
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const supabase = createClient(sbUrl, sbKey);

    let prompt;
    let config = {};

    if (type === 'format') {
      prompt = `Convert this raw khutbah transcript into RICH SEMANTIC HTML. 
      Mirror the original document's layout accurately.
      
      Formatting Rules:
      - Use <h2> for major section titles (e.g., 'Introduction', 'First Khutbah').
      - Use <h3> for sub-points or secondary titles.
      - Use <strong> for any emphasized, bolded, or highlighted phrases.
      - IMPORTANT: Wrap every piece of Arabic or Quranic text in a <div dir="rtl" class="bg-emerald-50 p-6 rounded-2xl my-6 font-serif text-2xl leading-loose text-right border-r-4 border-emerald-400">.
      - Wrap English paragraphs in <p class="mb-6 text-gray-700 leading-relaxed"> to ensure proper spacing.
      - Use <br /> for single line breaks within sections.
      - Ensure the output is valid HTML fragment. No <html> or <body> tags. No markdown code blocks.
      
      RAW CONTENT:
      ${content}`;
    } else if (type === 'cards') {
      prompt = `Based on the following khutbah HTML, generate a sequence of structured presentation cards.
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
        if (dbErr) throw new Error(`DB Update Error: ${dbErr.message}`);
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
        if (insErr) throw new Error(`Card Insertion Error: ${insErr.message}`);
      }
    }

    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error('[API/Process] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

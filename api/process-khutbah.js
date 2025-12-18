import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { content, type } = req.body;
  
  // Use the API_KEY directly from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let prompt;
    let config = {};
    
    if (type === 'format') {
      prompt = `Convert this khutbah into clean, professional HTML.
      Rules:
      - Title: <h1>
      - Sections: <h2>  
      - Paragraphs: <p>
      - Arabic: <p class="arabic" dir="rtl">
      - Quran: <blockquote class="quran">
      - Hadith: <blockquote class="hadith">
      - Author line if present: <p class="author">
      Return ONLY clean HTML content, no markdown wrappers.
      
      RAW TEXT: ${content}`;
    } else if (type === 'cards') {
      prompt = `Create a structured summary of the following khutbah as a JSON array of cards.
      Each card object must have: { card_number, section_label (INTRO/MAIN/HADITH/QURAN/STORY/PRACTICAL/CLOSING), title, bullet_points (array of strings), arabic_text (if any), key_quote (if any), quote_source (if any), time_estimate_seconds (integer) }
      Return ONLY a valid JSON array.
      
      KHUTBAH: ${content}`;
      
      config = {
          responseMimeType: 'application/json'
      };
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config
    });
    
    return res.status(200).json({ result: response.text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
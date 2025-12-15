import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { content, type } = req.body;
  
  if (!process.env.API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }

  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
  
  try {
    // Use gemini-1.5-flash for compatibility with this SDK version
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    let prompt;
    let generationConfig = {};
    
    if (type === 'format') {
      prompt = `Convert this khutbah into clean HTML.
      Rules:
      - Title: <h1>
      - Sections: <h2>  
      - Paragraphs: <p>
      - Arabic: <p class="arabic" dir="rtl">
      - Quran: <blockquote class="quran">
      - Hadith: <blockquote class="hadith">
      Return ONLY HTML, no markdown code blocks.
      
      KHUTBAH: ${content}`;
    } else if (type === 'cards') {
      prompt = `Create 10-15 summary cards as JSON array.
      Each: { card_number, section_label (INTRO/MAIN/HADITH/QURAN/STORY/PRACTICAL/CLOSING), title, bullet_points (array of strings), arabic_text, key_quote, quote_source, time_estimate_seconds }
      Return ONLY valid JSON array, no markdown.
      
      KHUTBAH: ${content}`;
      
      generationConfig = {
          responseMimeType: 'application/json'
      };
    }
    
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
    });
    
    const text = result.response.text();
    return res.status(200).json({ result: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
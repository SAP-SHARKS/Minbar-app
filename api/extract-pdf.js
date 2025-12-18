import pdf from 'pdf-parse';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    const buffer = Buffer.from(base64, 'base64');
    const data = await pdf(buffer);

    return res.status(200).json({ 
      text: data.text,
      info: data.info,
      numpages: data.numpages 
    });
  } catch (error) {
    console.error('PDF Extraction Error:', error);
    return res.status(500).json({ error: 'Failed to extract text: ' + error.message });
  }
}
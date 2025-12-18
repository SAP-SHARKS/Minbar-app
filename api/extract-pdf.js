import pdf from 'pdf-parse';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  console.log('[API/Extract] New Request');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { base64, fileName } = req.body;
    
    if (!base64) {
      console.error('[API/Extract] Missing base64 data');
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    console.log(`[API/Extract] Received file: ${fileName || 'unnamed.pdf'}`);
    console.log(`[API/Extract] Base64 string length: ${base64.length}`);

    const buffer = Buffer.from(base64, 'base64');
    console.log(`[API/Extract] Buffer created. Size: ${buffer.length} bytes`);

    console.log('[API/Extract] Starting pdf-parse...');
    const startTime = Date.now();
    
    const data = await pdf(buffer);
    
    const endTime = Date.now();
    console.log(`[API/Extract] pdf-parse complete in ${endTime - startTime}ms. Pages: ${data.numpages}`);

    if (!data.text || data.text.trim().length === 0) {
      console.warn('[API/Extract] Warning: No text was extracted from this PDF');
    }

    return res.status(200).json({
      text: data.text,
      info: data.info,
      numpages: data.numpages
    });

  } catch (error) {
    console.error('[API/Extract] CRITICAL FAILURE:', error);
    return res.status(500).json({
      error: `PDF Extraction failed: ${error.message}`,
      stack: error.stack,
      step: 'pdf-parsing'
    });
  }
}
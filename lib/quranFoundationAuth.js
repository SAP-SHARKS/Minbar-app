
let tokenCache = {
  token: null,
  expiresAt: 0
};

/**
 * Fetches an OAuth2 token using Client Credentials flow for Quran Foundation
 * Uses Vercel environment variables: QURAN_CLIENT_ID_PROD, QURAN_CLIENT_SECRET_PROD
 */
export async function getQFAccessToken() {
  const clientId = process.env.QURAN_CLIENT_ID_PROD;
  const clientSecret = process.env.QURAN_CLIENT_SECRET_PROD;
  const tokenUrl = 'https://oauth2.quran.foundation/oauth2/token';

  if (!clientId || !clientSecret) {
    console.error('[QF-AUTH] Missing credentials in environment');
    throw new Error('QF credentials not configured');
  }

  // Check cache (with 60s buffer)
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'content'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[QF-AUTH] Token retrieval failed:', errorData);
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    return tokenCache.token;
  } catch (error) {
    console.error('[QF-AUTH] Critical Auth Error:', error);
    throw error;
  }
}

export function getQFBaseUrl() {
  return 'https://apis.quran.foundation';
}

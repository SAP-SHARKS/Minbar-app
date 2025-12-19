
let tokenCache = {
  token: null,
  expiresAt: 0
};

/**
 * Get environment-specific URLs
 */
function getQFUrls() {
  const isProd = process.env.QF_ENV === 'prod';
  return {
    tokenUrl: isProd 
      ? 'https://oauth2.quran.foundation/oauth2/token' 
      : 'https://prelive-oauth2.quran.foundation/oauth2/token',
    apiUrl: isProd 
      ? 'https://apis.quran.foundation' 
      : 'https://apis-prelive.quran.foundation'
  };
}

/**
 * Fetches an OAuth2 token using Client Credentials flow
 */
export async function getQFAccessToken() {
  const { tokenUrl } = getQFUrls();
  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing QF_CLIENT_ID or QF_CLIENT_SECRET');
  }

  // Check cache (with 1 minute buffer)
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

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
    const error = await response.json();
    console.error('[QF-AUTH] Token Error:', error);
    throw new Error(`QF Auth Failed: ${error.error_description || response.statusText}`);
  }

  const data = await response.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };

  return tokenCache.token;
}

export function getQFBaseUrl() {
  return getQFUrls().apiUrl;
}

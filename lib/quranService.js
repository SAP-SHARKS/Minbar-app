
let tokenCache = {
  token: null,
  expiry: 0
};

/**
 * Fetches or retrieves cached OAuth2 token for QuranFoundation APIs
 */
export async function getQFToken() {
  // Use public fallback if credentials aren't provided
  if (!process.env.QF_CLIENT_ID || !process.env.QF_CLIENT_SECRET) {
    return null;
  }

  if (tokenCache.token && Date.now() < tokenCache.expiry) {
    return tokenCache.token;
  }

  try {
    const response = await fetch(process.env.QF_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.QF_CLIENT_ID,
        client_secret: process.env.QF_CLIENT_SECRET
      })
    });

    if (!response.ok) throw new Error('Token retrieval failed');

    const data = await response.json();
    tokenCache.token = data.access_token;
    // Cache for duration minus 1 minute safety buffer
    tokenCache.expiry = Date.now() + (data.expires_in * 1000) - 60000;
    return tokenCache.token;
  } catch (error) {
    console.error('[QF-AUTH] Error fetching token:', error);
    return null;
  }
}

/**
 * Shared fetch utility with headers and retries
 */
export async function fetchWithAuth(url, options = {}, retries = 3) {
  const token = await getQFToken();
  const headers = {
    ...options.headers,
    'x-client-id': process.env.QF_CLIENT_ID || 'public-guest'
  };

  if (token) {
    headers['x-auth-token'] = token;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}

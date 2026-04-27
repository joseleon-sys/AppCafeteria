const URL_API_POR_DEFECTO = 'http://localhost:3000';
const ACCESS_TOKEN_KEY = 'cafeteria_token';
const REFRESH_TOKEN_KEY = 'cafeteria_refresh_token';

function normalizarUrlApi(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function urlsUnicas(urls) {
  return urls.filter((url, index) => url && urls.indexOf(url) === index);
}

const URL_API = normalizarUrlApi(import.meta.env.VITE_API_URL || import.meta.env.BACKEND_URL || URL_API_POR_DEFECTO);
const URL_API_RESPALDO = normalizarUrlApi(import.meta.env.VITE_API_FALLBACK_URL || import.meta.env.VITE_RAILWAY_API_URL);
const URLS_API = urlsUnicas([URL_API, URL_API_RESPALDO]);

function obtenerTokenAuth() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function obtenerRefreshTokenAuth() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function guardarTokensAuth(payload = {}) {
  const accessToken = payload.accessToken || payload.token;
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (payload.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
}

export function limpiarTokensAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function obtenerCabecerasAuth(includeContentType = false) {
  const token = obtenerTokenAuth();
  const headers = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function gestionarRespuesta(response) {
  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return payload;
}

async function refrescarAccessToken(baseUrl) {
  const refreshToken = obtenerRefreshTokenAuth();
  if (!refreshToken) return null;

  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    limpiarTokensAuth();
    return null;
  }

  const payload = await response.json().catch(() => null);
  guardarTokensAuth(payload || {});
  return payload?.accessToken || payload?.token || null;
}

export async function peticionApi(path, options = {}, { auth = false, contentType = false } = {}) {
  const headers = {
    ...(auth ? obtenerCabecerasAuth(contentType) : (contentType ? { 'Content-Type': 'application/json' } : {})),
    ...(options.headers || {}),
  };

  let lastNetworkError;

  for (const baseUrl of URLS_API) {
    let response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      lastNetworkError = error;
      continue;
    }

    if (auth && (response.status === 401 || response.status === 403)) {
      const nuevoAccessToken = await refrescarAccessToken(baseUrl);
      if (nuevoAccessToken) {
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${nuevoAccessToken}`,
        };

        const retryResponse = await fetch(`${baseUrl}${path}`, {
          ...options,
          headers: retryHeaders,
        });

        return gestionarRespuesta(retryResponse);
      }
    }

    return gestionarRespuesta(response);
  }

  throw lastNetworkError || new Error('No API URL configured');
}

export {
  URL_API,
  URL_API_RESPALDO,
  URLS_API,
  obtenerTokenAuth,
  obtenerRefreshTokenAuth,
  obtenerCabecerasAuth,
  gestionarRespuesta,
};

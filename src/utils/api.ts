import { handleLocalFallbackRequest } from './localFallbackApi';

const TOKEN_KEY = 'smmvin_session_token';

export function getSessionToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setSessionToken(token: string): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getSessionToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('x-session-token', token);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    // If deployed on static hosting (like GitHub Pages), /api/* returns 404 or HTML instead of JSON
    if (
      res.status === 404 ||
      res.status === 405 ||
      res.status >= 502 ||
      !contentType.includes('application/json')
    ) {
      return handleLocalFallbackRequest(url, options, token);
    }

    return res;
  } catch {
    // Fallback to client-side LocalStorage engine when backend server is not present
    return handleLocalFallbackRequest(url, options, token);
  }
}

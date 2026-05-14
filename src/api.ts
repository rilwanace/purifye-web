const BASE = '';

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function csrfHeaders(method?: string): Record<string, string> {
  const m = (method || 'GET').toUpperCase();
  if (!UNSAFE_METHODS.includes(m)) return {};
  const token = getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(method),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

/** Multipart/FormData uploads — credentials + CSRF, no Content-Type (browser sets boundary) */
export async function apiFormData<T = any>(path: string, body: FormData, method = 'POST'): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...csrfHeaders(method),
    },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}


/** Binary/blob downloads — credentials + CSRF, returns raw Response for .blob() */
export async function apiBlob(path: string, options?: RequestInit): Promise<Response> {
  const method = options?.method || 'GET';
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...csrfHeaders(method),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res;
}

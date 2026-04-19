const DEFAULT_API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8000/api/v1' : '/api/v1';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
const SESSION_STORAGE_KEY = 'marketclaw.session';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
}

export interface SessionPayload {
  token: string;
  user: SessionUser;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getStoredSession(): SessionPayload | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: SessionPayload | null) {
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof payload === 'object' && payload && 'message' in payload && typeof payload.message === 'string' && payload.message) ||
      (typeof payload === 'string' && payload) ||
      'Request failed.';

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function emitTradingDataChanged() {
  window.dispatchEvent(new CustomEvent('marketclaw:data-changed'));
}

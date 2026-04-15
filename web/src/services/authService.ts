import { apiFetch, getStoredSession, setStoredSession, type SessionPayload } from './api';

type AuthResponse = {
  data: {
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      avatar_url?: string | null;
    };
  };
};

export const authService = {
  getSession() {
    return getStoredSession();
  },

  async login(email: string, password: string) {
    const response = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const session: SessionPayload = {
      token: response.data.token,
      user: response.data.user,
    };

    setStoredSession(session);
    return session;
  },

  async register(name: string, email: string, password: string, passwordConfirmation: string) {
    const response = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
    });

    const session: SessionPayload = {
      token: response.data.token,
      user: response.data.user,
    };

    setStoredSession(session);
    return session;
  },

  async restore() {
    const session = getStoredSession();

    if (!session) {
      return null;
    }

    try {
      await apiFetch(`/users/${session.user.id}/me`);
      return session;
    } catch {
      setStoredSession(null);
      return null;
    }
  },

  async logout() {
    const session = getStoredSession();

    if (session) {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch {
        // Best effort logout.
      }
    }

    setStoredSession(null);
  },
};

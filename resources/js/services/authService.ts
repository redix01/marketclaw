import { apiFetch, getStoredSession, setStoredSession, type SessionPayload } from './api';

type AuthResponse = {
  data: {
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      avatar_url?: string | null;
      status?: string;
      is_admin?: boolean;
    };
  };
};

export type VerificationChallenge = {
  verification_required: true;
  email: string;
  expires_at?: string | null;
  expires_in_seconds?: number | null;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
    status?: string;
    is_admin?: boolean;
  };
};

type VerificationChallengeResponse = {
  message: string;
  data: VerificationChallenge;
};

function storeSession(response: AuthResponse) {
  const session: SessionPayload = {
    token: response.data.token,
    user: response.data.user,
  };

  setStoredSession(session);

  return session;
}

export const authService = {
  getSession() {
    return getStoredSession();
  },

  async login(email: string, password: string) {
    const response = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    return storeSession(response);
  },

  async loginAdmin(email: string, password: string) {
    const response = await apiFetch<AuthResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    return storeSession(response);
  },

  async register(name: string, email: string, password: string, passwordConfirmation: string) {
    return apiFetch<VerificationChallengeResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
    });
  },

  async verifyEmailCode(email: string, code: string) {
    const response = await apiFetch<AuthResponse>('/auth/verify-email-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    return storeSession(response);
  },

  async resendVerificationCode(email: string) {
    return apiFetch<{ message: string }>('/auth/resend-verification-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async restore() {
    const session = getStoredSession();

    if (!session) {
      return null;
    }

    try {
      if (session.user.is_admin) {
        await apiFetch('/admin/me');
      } else {
        await apiFetch(`/users/${session.user.id}/me`);
      }
      return session;
    } catch {
      setStoredSession(null);
      return null;
    }
  },

  async forgotPassword(email: string) {
    return apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }) {
    return apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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

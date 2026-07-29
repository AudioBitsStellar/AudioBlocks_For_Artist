import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAuthServices, {
  storeToken,
  getStoredToken,
  isTokenExpired,
  clearTokens,
  refreshAccessToken,
} from '@/services/authService';
import Cookies from 'js-cookie';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn();

vi.mock('@/api/queryClient', () => ({
  usePost: vi.fn((endpoint: string, options?: { onSuccess?: () => void; onError?: (err: Error) => void }) => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    options,
  })),
}));

vi.mock('@/hooks/useToastHandler', () => ({
  useHandleError: () => vi.fn((msg: string) => msg),
  useHandleSuccess: () => vi.fn((msg: string) => msg),
}));

const FAKE_TOKEN = 'header.payload.signature';
const REFRESHED_TOKEN = 'header2.payload2.signature2';

describe('authService — unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Cookies.remove('audioblocks_jwt');
  });

  describe('useAuthServices hooks', () => {
    it('provides useRegisterEmail and useLoginEmail hooks', () => {
      const { result } = renderHook(() => useAuthServices());
      expect(result.current.useRegisterEmail).toBeDefined();
      expect(result.current.useLoginEmail).toBeDefined();
    });

    it('useRegisterEmail mutation executes successfully', async () => {
      mockMutateAsync.mockResolvedValueOnce({ success: true, token: FAKE_TOKEN, user: { id: '1', role: 'artist' } });
      const { result } = renderHook(() => useAuthServices());
      const registerMutation = result.current.useRegisterEmail();

      const payload = {
        name: 'Test Artist',
        username: 'testartist',
        email: 'artist@example.com',
        password: 'password123',
        role: 'artist' as const,
      };

      const res = await registerMutation.mutateAsync(payload);
      expect(res.success).toBe(true);
      expect(res.token).toBe(FAKE_TOKEN);
    });

    it('useRegisterEmail surfaces errors on duplicate email or failure', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Email already registered'));
      const { result } = renderHook(() => useAuthServices());
      const registerMutation = result.current.useRegisterEmail();

      const payload = {
        name: 'Test Artist',
        username: 'testartist',
        email: 'duplicate@example.com',
        password: 'password123',
        role: 'artist' as const,
      };

      await expect(registerMutation.mutateAsync(payload)).rejects.toThrow('Email already registered');
    });

    it('useLoginEmail mutation executes login successfully', async () => {
      mockMutateAsync.mockResolvedValueOnce({ success: true, token: FAKE_TOKEN, user: { id: '1', role: 'artist' } });
      const { result } = renderHook(() => useAuthServices());
      const loginMutation = result.current.useLoginEmail();

      const payload = {
        email: 'artist@example.com',
        password: 'password123',
      };

      const res = await loginMutation.mutateAsync(payload);
      expect(res.success).toBe(true);
      expect(res.token).toBe(FAKE_TOKEN);
    });

    it('useLoginEmail fails with invalid credentials', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Invalid email or password'));
      const { result } = renderHook(() => useAuthServices());
      const loginMutation = result.current.useLoginEmail();

      const payload = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      };

      await expect(loginMutation.mutateAsync(payload)).rejects.toThrow('Invalid email or password');
    });

    it('useLoginEmail handles network errors gracefully', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error: Unable to connect'));
      const { result } = renderHook(() => useAuthServices());
      const loginMutation = result.current.useLoginEmail();

      await expect(loginMutation.mutateAsync({ email: 'test@example.com', password: 'password' })).rejects.toThrow(
        'Network error: Unable to connect'
      );
    });
  });

  describe('Token management & Refresh flow', () => {
    it('stores token and retrieves valid token', () => {
      storeToken(FAKE_TOKEN, 3600);
      expect(getStoredToken()).toBe(FAKE_TOKEN);
      expect(isTokenExpired()).toBe(false);
    });

    it('refreshes token when current token is expired', async () => {
      storeToken(FAKE_TOKEN, -10);
      expect(isTokenExpired()).toBe(true);

      const refreshFn = vi.fn().mockResolvedValueOnce({ token: REFRESHED_TOKEN, expiresIn: 3600 });
      const token = await refreshAccessToken(refreshFn);

      expect(refreshFn).toHaveBeenCalledTimes(1);
      expect(token).toBe(REFRESHED_TOKEN);
      expect(getStoredToken()).toBe(REFRESHED_TOKEN);
    });

    it('clears session tokens and cookies on logout', () => {
      storeToken(FAKE_TOKEN, 3600);
      Cookies.set('audioblocks_jwt', FAKE_TOKEN);

      clearTokens();

      expect(getStoredToken()).toBeNull();
      expect(Cookies.get('audioblocks_jwt')).toBeUndefined();
    });
  });
});

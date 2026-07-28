import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cookies from 'js-cookie';
import {
  storeToken,
  getStoredToken,
  isTokenExpired,
  clearTokens,
  refreshAccessToken,
} from '@/services/authService';

// A syntactically well-formed (but unsigned/fake) JWT: header.payload.signature.
const FAKE_TOKEN = 'header.payload.signature';
const OTHER_FAKE_TOKEN = 'header2.payload2.signature2';

describe('authService — token management', () => {
  beforeEach(() => {
    localStorage.clear();
    Cookies.remove('audioblocks_jwt');
  });

  describe('storeToken / getStoredToken', () => {
    it('stores a token to localStorage and reads it back', () => {
      storeToken(FAKE_TOKEN);
      expect(getStoredToken()).toBe(FAKE_TOKEN);
    });

    it('returns null when no token has been stored', () => {
      expect(getStoredToken()).toBeNull();
    });

    it('overwrites a previously stored token', () => {
      storeToken(FAKE_TOKEN);
      storeToken(OTHER_FAKE_TOKEN);
      expect(getStoredToken()).toBe(OTHER_FAKE_TOKEN);
    });

    it('falls back to the audioblocks_jwt cookie when localStorage is empty', () => {
      Cookies.set('audioblocks_jwt', FAKE_TOKEN);
      expect(getStoredToken()).toBe(FAKE_TOKEN);
    });
  });

  describe('malformed / corrupted tokens', () => {
    it('treats an empty string as no token', () => {
      storeToken('');
      expect(getStoredToken()).toBeNull();
    });

    it('rejects a token that is not in header.payload.signature shape', () => {
      localStorage.setItem('token', 'not-a-real-jwt');
      expect(getStoredToken()).toBeNull();
    });

    it('rejects a token with too many segments', () => {
      localStorage.setItem('token', 'a.b.c.d');
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('is false when no expiry was ever recorded', () => {
      storeToken(FAKE_TOKEN);
      expect(isTokenExpired()).toBe(false);
    });

    it('is false for a token stored with a future expiry', () => {
      storeToken(FAKE_TOKEN, 3600);
      expect(isTokenExpired()).toBe(false);
    });

    it('is true once the recorded expiry has passed', () => {
      storeToken(FAKE_TOKEN, -1);
      expect(isTokenExpired()).toBe(true);
    });
  });

  describe('clearTokens (logout cleanup)', () => {
    it('removes the stored token, its expiry, and the auth cookie', () => {
      storeToken(FAKE_TOKEN, 3600);
      Cookies.set('audioblocks_jwt', FAKE_TOKEN);

      clearTokens();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('token_expiry')).toBeNull();
      expect(Cookies.get('audioblocks_jwt')).toBeUndefined();
      expect(getStoredToken()).toBeNull();
    });

    it('is safe to call when nothing was ever stored', () => {
      expect(() => clearTokens()).not.toThrow();
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('returns the current token without refreshing when it is not expired', async () => {
      storeToken(FAKE_TOKEN, 3600);
      const refresh = vi.fn();

      const result = await refreshAccessToken(refresh);

      expect(result).toBe(FAKE_TOKEN);
      expect(refresh).not.toHaveBeenCalled();
    });

    it('calls refresh and stores the new token when the current one is expired', async () => {
      storeToken(FAKE_TOKEN, -1);
      const refresh = vi.fn().mockResolvedValue({ token: OTHER_FAKE_TOKEN, expiresIn: 3600 });

      const result = await refreshAccessToken(refresh);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(result).toBe(OTHER_FAKE_TOKEN);
      expect(getStoredToken()).toBe(OTHER_FAKE_TOKEN);
      expect(isTokenExpired()).toBe(false);
    });

    it('calls refresh when there is no stored token at all', async () => {
      const refresh = vi.fn().mockResolvedValue({ token: FAKE_TOKEN, expiresIn: 3600 });

      const result = await refreshAccessToken(refresh);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(result).toBe(FAKE_TOKEN);
    });

    it('clears tokens and returns null when refresh fails', async () => {
      storeToken(FAKE_TOKEN, -1);
      const refresh = vi.fn().mockRejectedValue(new Error('refresh failed'));

      const result = await refreshAccessToken(refresh);

      expect(result).toBeNull();
      expect(getStoredToken()).toBeNull();
    });
  });
});

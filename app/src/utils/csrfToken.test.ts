import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Cookies from "js-cookie";
import {
  generateCSRFToken,
  getCSRFToken,
  setCSRFToken,
  refreshCSRFToken,
  clearCSRFToken,
  getCSRFTokenHeader,
  CSRF_HEADER_NAME,
} from "./csrfToken";

vi.mock("js-cookie");

describe("CSRF Token Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as unknown as Record<string, unknown>).window;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generateCSRFToken", () => {
    it("generates a token as a 64-character hex string", () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generates a different token each time", () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("getCSRFToken", () => {
    it("returns token from cookies when available", () => {
      (global as unknown as Record<string, unknown>).window = {};
      const mockToken = "test-csrf-token";
      (Cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(mockToken);

      const token = getCSRFToken();
      expect(token).toBe(mockToken);
      expect(Cookies.get).toHaveBeenCalledWith("audioblocks_csrf_token");
    });

    it("returns null when token not in cookies", () => {
      (global as unknown as Record<string, unknown>).window = {};
      (Cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      const token = getCSRFToken();
      expect(token).toBeNull();
    });

    it("returns null when window is undefined (SSR)", () => {
      expect(getCSRFToken()).toBeNull();
    });
  });

  describe("setCSRFToken", () => {
    it("sets token in cookies with secure flags", () => {
      (global as unknown as Record<string, unknown>).window = {};
      const mockToken = "new-csrf-token";

      setCSRFToken(mockToken);

      expect(Cookies.set).toHaveBeenCalledWith("audioblocks_csrf_token", mockToken, {
        secure: false,
        sameSite: "strict",
      });
    });

    it("does nothing when window is undefined (SSR)", () => {
      setCSRFToken("test-token");
      expect(Cookies.set).not.toHaveBeenCalled();
    });
  });

  describe("refreshCSRFToken", () => {
    it("generates a new token and stores it", () => {
      (global as unknown as Record<string, unknown>).window = {};
      const spy = vi.spyOn(Cookies, "set");

      const newToken = refreshCSRFToken();

      expect(newToken).toMatch(/^[a-f0-9]{64}$/);
      expect(spy).toHaveBeenCalledWith("audioblocks_csrf_token", newToken, {
        secure: false,
        sameSite: "strict",
      });
    });
  });

  describe("clearCSRFToken", () => {
    it("removes CSRF token from cookies", () => {
      (global as unknown as Record<string, unknown>).window = {};

      clearCSRFToken();

      expect(Cookies.remove).toHaveBeenCalledWith("audioblocks_csrf_token");
    });

    it("does nothing when window is undefined (SSR)", () => {
      clearCSRFToken();
      expect(Cookies.remove).not.toHaveBeenCalled();
    });
  });

  describe("getCSRFTokenHeader", () => {
    it("returns header object with CSRF token when available", () => {
      (global as unknown as Record<string, unknown>).window = {};
      const mockToken = "test-csrf-token";
      (Cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(mockToken);

      const headers = getCSRFTokenHeader();

      expect(headers).toEqual({
        "X-CSRF-Token": mockToken,
      });
    });

    it("returns empty object when token not available", () => {
      (global as unknown as Record<string, unknown>).window = {};
      (Cookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const headers = getCSRFTokenHeader();

      expect(headers).toEqual({});
    });
  });

  describe("CSRF_HEADER_NAME", () => {
    it("exports the correct header name", () => {
      expect(CSRF_HEADER_NAME).toBe("X-CSRF-Token");
    });
  });
});

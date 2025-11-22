import "@testing-library/jest-dom";
import {
  isAuthenticated,
  logout,
  login,
  register,
  fetchWithAuth,
} from "@/lib/auth";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("Auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("isAuthenticated", () => {
    it("should return true when auth tokens exist", () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "token", refresh: "refresh" }),
      );

      expect(isAuthenticated()).toBe(true);
    });

    it("should return false when auth tokens don't exist", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("should return false in SSR context", () => {
      // Simulate SSR by temporarily removing window
      const originalWindow = global.window;
      // @ts-expect-error - intentionally removing window for test
      delete global.window;

      expect(isAuthenticated()).toBe(false);

      global.window = originalWindow;
    });
  });

  describe("logout", () => {
    it("should remove auth tokens from localStorage", () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "token", refresh: "refresh" }),
      );

      logout();

      expect(localStorage.getItem("auth_tokens")).toBeNull();
    });
  });

  describe("login", () => {
    it("should store tokens after successful login", async () => {
      const mockResponse = {
        access: "access_token",
        refresh: "refresh_token",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await login("testuser", "password123");

      const stored = JSON.parse(localStorage.getItem("auth_tokens") || "{}");
      expect(stored).toEqual(mockResponse);
    });

    it("should throw error on failed login", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Invalid credentials" }),
      } as Response);

      await expect(login("testuser", "wrong")).rejects.toThrow(
        "Invalid credentials",
      );
    });

    it("should throw generic error when detail is missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(login("testuser", "wrong")).rejects.toThrow(
        "Invalid credentials",
      );
    });
  });

  describe("register", () => {
    it("should register user successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const payload = {
        username: "newuser",
        email: "new@example.com",
        first_name: "New",
        last_name: "User",
        password: "password123",
        role: "ATTENDEE" as const,
      };

      await expect(register(payload)).resolves.not.toThrow();
    });

    it("should throw validation errors", async () => {
      const mockError = {
        username: ["This field is required."],
        email: ["Invalid email format."],
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockError,
      } as Response);

      const payload = {
        username: "",
        email: "invalid",
        first_name: "New",
        last_name: "User",
        password: "password123",
        role: "ATTENDEE" as const,
      };

      await expect(register(payload)).rejects.toEqual(mockError);
    });

    it("should handle JSON parse error in register", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      const payload = {
        username: "newuser",
        email: "new@example.com",
        first_name: "New",
        last_name: "User",
        password: "password123",
        role: "ATTENDEE" as const,
      };

      await expect(register(payload)).rejects.toEqual({});
    });
  });

  describe("fetchWithAuth", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should add Authorization header when token exists", async () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "test_token", refresh: "refresh_token" }),
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as Response);

      await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe("http://localhost:8000/api/test");
      expect(callArgs[1]?.headers).toBeDefined();
      // Headers can be a Headers object or a plain object
      const headers = callArgs[1]?.headers;
      if (headers instanceof Headers) {
        expect(headers.get("Authorization")).toBe("Bearer test_token");
      } else {
        // If it's a plain object, check the Authorization property
        expect((headers as Record<string, string>).Authorization).toBe(
          "Bearer test_token",
        );
      }
    });

    it("should retry with refreshed token on 401", async () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "old_token", refresh: "refresh_token" }),
      );

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        // Refresh token call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access: "new_token" }),
        } as Response)
        // Retry with new token
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: "success" }),
        } as Response);

      const response = await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should return 401 response when refresh fails", async () => {
      // Mock Response constructor if not available
      if (typeof Response === "undefined") {
        global.Response = class MockResponse {
          status: number;
          ok: boolean;
          statusText: string;
          private _body: string;
          private _headers: Record<string, string>;

          constructor(
            body: string,
            init?: {
              status?: number;
              statusText?: string;
              headers?: Record<string, string>;
            },
          ) {
            this._body = body;
            this.status = init?.status || 200;
            this.ok = this.status >= 200 && this.status < 300;
            this.statusText = init?.statusText || "OK";
            this._headers = init?.headers || {};
          }

          async json() {
            return JSON.parse(this._body);
          }

          async text() {
            return this._body;
          }
        } as typeof Response;
      }

      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "old_token", refresh: "refresh_token" }),
      );

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        // Refresh token call fails
        .mockResolvedValueOnce({
          ok: false,
        } as Response);

      const response = await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
      });

      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);

      const json = await response.json();
      expect(json.detail).toBe("Session expired. Please log in again.");
      expect(localStorage.getItem("auth_tokens")).toBeNull();
    });

    it("should handle missing tokens gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as Response);

      await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/test",
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        }),
      );
    });

    it("should handle error parsing auth tokens", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      localStorage.setItem("auth_tokens", "invalid json");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as Response);

      await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
      });

      // Should still make the request without Authorization header
      expect(mockFetch).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should merge custom headers with default headers", async () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "test_token", refresh: "refresh_token" }),
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as Response);

      await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers;
      if (headers instanceof Headers) {
        expect(headers.get("Authorization")).toBe("Bearer test_token");
        expect(headers.get("X-Custom-Header")).toBe("custom-value");
      }
    });

    it("should use Response fallback when Response is undefined", async () => {
      // Temporarily remove Response
      const originalResponse = global.Response;
      // @ts-expect-error - intentionally removing Response for test
      delete global.Response;

      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "old_token", refresh: "refresh_token" }),
      );

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        // Refresh token call fails
        .mockResolvedValueOnce({
          ok: false,
        } as Response);

      const response = await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
      });

      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
      const json = await response.json();
      expect(json.detail).toBe("Session expired. Please log in again.");

      // Restore Response
      global.Response = originalResponse;
    });

    it("should handle refresh token catch error", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "old_token", refresh: "refresh_token" }),
      );

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        // Refresh token call throws error
        .mockRejectedValueOnce(new Error("Network error"));

      const response = await fetchWithAuth("http://localhost:8000/api/test", {
        method: "GET",
      });

      expect(response.status).toBe(401);
      expect(localStorage.getItem("auth_tokens")).toBeNull();
      consoleSpy.mockRestore();
    });
  });
});

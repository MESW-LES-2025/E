import { isAuthenticated, logout, login, getAuthToken } from "@/lib/auth";

const storageKey = "auth_tokens";

const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
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

global.fetch = jest.fn();
const mockFetch = fetch as jest.Mock;

describe("auth library", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockFetch.mockClear();
  });

  describe("isAuthenticated", () => {
    it("should return false when no token is in localStorage", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("should return true when a token is in localStorage", () => {
      localStorageMock.setItem(storageKey, "some-token");
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe("logout", () => {
    it("should remove the token from localStorage", () => {
      localStorageMock.setItem(storageKey, "some-token");
      logout();
      expect(localStorageMock.getItem(storageKey)).toBeNull();
    });
  });

  describe("login", () => {
    it("should store tokens in localStorage on successful login", async () => {
      const tokens = { access: "access-token", refresh: "refresh-token" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokens),
      });

      await login("testuser", "password");

      const storedTokens = localStorageMock.getItem(storageKey);
      expect(storedTokens).toBe(JSON.stringify(tokens));
    });

    it("should throw an error with a specific message on failed login", async () => {
      const errorDetail = "Invalid credentials provided.";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: errorDetail }),
      });

      await expect(login("testuser", "wrongpassword")).rejects.toThrow(
        errorDetail,
      );
      expect(localStorageMock.getItem(storageKey)).toBeNull();
    });

    it("should throw an error if the error response is not valid JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(login("testuser", "wrongpassword")).rejects.toThrow(
        "Invalid credentials",
      );
      expect(localStorageMock.getItem(storageKey)).toBeNull();
    });
  });

  describe("getAuthToken", () => {
    it("should return null if no token is stored", async () => {
      expect(await getAuthToken()).toBeNull();
    });

    it("should return the access token if tokens are stored", async () => {
      const tokens = { access: "access-token", refresh: "refresh-token" };
      localStorageMock.setItem(storageKey, JSON.stringify(tokens));
      expect(await getAuthToken()).toBe("access-token");
    });

    it("should return null if stored data is not valid JSON", async () => {
      localStorageMock.setItem(storageKey, "not-json");
      expect(await getAuthToken()).toBeNull();
    });
  });
});

import { fetchWithAuth } from "../../lib/auth";
import {
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
} from "../../lib/notifications";

// Mock fetchWithAuth
jest.mock("../../lib/auth", () => ({
  fetchWithAuth: jest.fn(),
}));

const mockFetchWithAuth = fetchWithAuth as jest.Mock;

describe("Notification Library", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUnreadCount", () => {
    it("should return the unread count on success", async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({ unread: 5 }),
      });
      const count = await getUnreadCount();
      expect(count).toBe(5);
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/notifications/unread-count/"),
        {
          method: "GET",
        },
      );
    });

    it("should throw an error on failure", async () => {
      mockFetchWithAuth.mockResolvedValue({ ok: false });
      await expect(getUnreadCount()).rejects.toThrow(
        "Failed to fetch unread count",
      );
    });

    it("should return 0 if unread count is not in response", async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      const count = await getUnreadCount();
      expect(count).toBe(0);
    });
  });

  describe("listNotifications", () => {
    it("should return a list of notifications", async () => {
      const mockData = [{ id: 1, title: "Test" }];
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });
      const notifications = await listNotifications();
      expect(notifications).toEqual(mockData);
    });

    it("should return a list of notifications from a paginated response", async () => {
      const mockData = { results: [{ id: 1, title: "Test" }] };
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });
      const notifications = await listNotifications();
      expect(notifications).toEqual(mockData.results);
    });

    it("should return an empty list if paginated response has no results", async () => {
      const mockData = { count: 0, next: null, previous: null };
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });
      const notifications = await listNotifications();
      expect(notifications).toEqual([]);
    });

    it("should throw an error on failure", async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: false,
      });
      await expect(listNotifications()).rejects.toThrow(
        "Failed to fetch notifications",
      );
    });
  });

  describe("markAsRead", () => {
    it("should make a POST request to the correct endpoint", async () => {
      mockFetchWithAuth.mockResolvedValue({ ok: true });
      await markAsRead(123);
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/notifications/123/mark-as-read/"),
        { method: "POST" },
      );
    });

    it("should throw an error on failure", async () => {
      mockFetchWithAuth.mockResolvedValue({ ok: false });
      await expect(markAsRead(123)).rejects.toThrow("Failed to mark as read");
    });
  });

  describe("markAsUnread", () => {
    it("should make a POST request to the correct endpoint", async () => {
      mockFetchWithAuth.mockResolvedValue({ ok: true });
      await markAsUnread(456);
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/notifications/456/mark-as-unread/"),
        { method: "POST" },
      );
    });

    it("should throw an error on failure", async () => {
      mockFetchWithAuth.mockResolvedValue({ ok: false });
      await expect(markAsUnread(456)).rejects.toThrow(
        "Failed to mark as unread",
      );
    });
  });

  describe("markAllAsRead", () => {
    it("should return the number of updated items", async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({ updated: 3 }),
      });
      const result = await markAllAsRead();
      expect(result).toBe(3);
    });

    it("should return 0 if updated count is not in response", async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      const result = await markAllAsRead();
      expect(result).toBe(0);
    });

    it("should throw an error on failure", async () => {
      mockFetchWithAuth.mockResolvedValue({ ok: false });
      await expect(markAllAsRead()).rejects.toThrow(
        "Failed to mark all as read",
      );
    });
  });

  describe("API_BASE fallback", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("should use an empty string for API_BASE when NEXT_PUBLIC_API_BASE_URL is not set", async () => {
      const { getUnreadCount } = await import("../../lib/notifications");
      const { fetchWithAuth: mockedFetch } = (await import(
        "../../lib/auth"
      )) as unknown as { fetchWithAuth: jest.Mock };

      mockedFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await getUnreadCount();

      expect(mockedFetch).toHaveBeenCalledWith("/notifications/unread-count/", {
        method: "GET",
      });
    });
  });
});

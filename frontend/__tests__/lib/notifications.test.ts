import { fetchWithAuth } from "../../lib/auth";
import {
  getUnreadCount,
  getFilteredUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  registerNotificationRefreshCallback,
  runNotificationRefreshCallbacks,
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

  describe("registerNotificationRefreshCallback", () => {
    it("should register a callback function", () => {
      const callback = jest.fn();
      registerNotificationRefreshCallback(callback);
      runNotificationRefreshCallbacks();
      expect(callback).toHaveBeenCalled();
    });

    it("should replace existing callback when called again", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      registerNotificationRefreshCallback(callback1);
      registerNotificationRefreshCallback(callback2);
      runNotificationRefreshCallbacks();
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe("runNotificationRefreshCallbacks", () => {
    it("should call registered callback", () => {
      const callback = jest.fn();
      registerNotificationRefreshCallback(callback);
      runNotificationRefreshCallbacks();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not throw when no callback is registered", () => {
      registerNotificationRefreshCallback(null as unknown as () => void);
      expect(() => runNotificationRefreshCallbacks()).not.toThrow();
    });
  });

  describe("getFilteredUnreadCount", () => {
    it("should return unread count when reminders are enabled", async () => {
      const mockNotifications = [
        {
          id: 1,
          title: "Event Reminder",
          is_read: false,
          message: "",
          created_at: "",
        },
        {
          id: 2,
          title: "Other Notification",
          is_read: false,
          message: "",
          created_at: "",
        },
        {
          id: 3,
          title: "Read Notification",
          is_read: true,
          message: "",
          created_at: "",
        },
      ];
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => mockNotifications,
      });
      const count = await getFilteredUnreadCount(true);
      expect(count).toBe(2);
    });

    it("should filter out reminders when reminders are disabled", async () => {
      const mockNotifications = [
        {
          id: 1,
          title: "Event Reminder",
          is_read: false,
          message: "",
          created_at: "",
        },
        {
          id: 2,
          title: "Other Notification",
          is_read: false,
          message: "",
          created_at: "",
        },
        {
          id: 3,
          title: "Event Reminder",
          is_read: true,
          message: "",
          created_at: "",
        },
      ];
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => mockNotifications,
      });
      const count = await getFilteredUnreadCount(false);
      expect(count).toBe(1); // Only "Other Notification" is unread and not a reminder
    });

    it("should return 0 when all notifications are read", async () => {
      const mockNotifications = [
        {
          id: 1,
          title: "Event Reminder",
          is_read: true,
          message: "",
          created_at: "",
        },
        {
          id: 2,
          title: "Other Notification",
          is_read: true,
          message: "",
          created_at: "",
        },
      ];
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => mockNotifications,
      });
      const count = await getFilteredUnreadCount(true);
      expect(count).toBe(0);
    });

    it("should handle empty notifications list", async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      const count = await getFilteredUnreadCount(true);
      expect(count).toBe(0);
    });
  });
});

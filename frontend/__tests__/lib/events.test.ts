import {
  cancelEventRequest,
  uncancelEventRequest,
  getMyOrganizedEvents,
  getEventInterestedUsers,
  markEventAsInterested,
  unmarkEventAsInterested,
  getInterestedEvents,
} from "../../lib/events";
import { fetchWithAuth } from "../../lib/auth";

jest.mock("../../lib/auth", () => ({
  fetchWithAuth: jest.fn(),
}));

const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<
  typeof fetchWithAuth
>;

describe("Events API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("cancelEventRequest", () => {
    it("should call fetchWithAuth with correct URL and method", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await cancelEventRequest(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/events/1/cancel/"),
        { method: "POST" },
      );
    });
  });

  describe("uncancelEventRequest", () => {
    it("should call fetchWithAuth with correct URL and method", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await uncancelEventRequest(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/events/1/uncancel/"),
        { method: "POST" },
      );
    });
  });

  describe("getMyOrganizedEvents", () => {
    it("should return events array on success", async () => {
      const mockEvents = [
        { id: 1, name: "Event 1", date: "2024-01-01", category: "SOCIAL" },
        { id: 2, name: "Event 2", date: "2024-01-02", category: "ACADEMIC" },
      ];

      const mockResponse = {
        ok: true,
        json: async () => mockEvents,
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await getMyOrganizedEvents();

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/events/my-organized/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockEvents);
    });

    it("should return results array when response has results property", async () => {
      const mockEvents = [
        { id: 1, name: "Event 1", date: "2024-01-01", category: "SOCIAL" },
      ];

      const mockResponse = {
        ok: true,
        json: async () => ({ results: mockEvents }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await getMyOrganizedEvents();

      expect(result).toEqual(mockEvents);
    });

    it("should throw error when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ detail: "Unauthorized" }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(getMyOrganizedEvents()).rejects.toThrow("Unauthorized");
    });

    it("should throw default error when response has no detail", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({}),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(getMyOrganizedEvents()).rejects.toThrow(
        "Failed to fetch organized events",
      );
    });
  });

  describe("getEventInterestedUsers", () => {
    it("should return participants array on success", async () => {
      const mockParticipants = [
        {
          id: 1,
          username: "user1",
          first_name: "John",
          last_name: "Doe",
        },
        {
          id: 2,
          username: "user2",
          first_name: "Jane",
          last_name: "Smith",
        },
      ];

      const mockResponse = {
        ok: true,
        json: async () => mockParticipants,
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await getEventInterestedUsers(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/events/1/interested-users/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockParticipants);
    });

    it("should return results array when response has results property", async () => {
      const mockParticipants = [
        {
          id: 1,
          username: "user1",
          first_name: "John",
          last_name: "Doe",
        },
      ];

      const mockResponse = {
        ok: true,
        json: async () => ({ results: mockParticipants }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await getEventInterestedUsers(1);

      expect(result).toEqual(mockParticipants);
    });

    it("should throw error when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ detail: "Not found" }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(getEventInterestedUsers(1)).rejects.toThrow("Not found");
    });

    it("should throw default error when response has no detail", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({}),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(getEventInterestedUsers(1)).rejects.toThrow(
        "Failed to fetch interested users",
      );
    });
  });

  describe("markEventAsInterested", () => {
    it("should return interest data on success", async () => {
      const mockResponseData = {
        interest_count: 5,
        is_interested: true,
      };

      const mockResponse = {
        ok: true,
        json: async () => mockResponseData,
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await markEventAsInterested(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/events/1/interested/"),
        { method: "POST" },
      );
      expect(result).toEqual(mockResponseData);
    });

    it("should throw error when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ detail: "Event not found" }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(markEventAsInterested(1)).rejects.toThrow("Event not found");
    });

    it("should throw default error when response has no detail", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({}),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(markEventAsInterested(1)).rejects.toThrow(
        "Failed to mark event as interested",
      );
    });
  });

  describe("unmarkEventAsInterested", () => {
    it("should return interest data on success", async () => {
      const mockResponseData = {
        interest_count: 4,
        is_interested: false,
      };

      const mockResponse = {
        ok: true,
        json: async () => mockResponseData,
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await unmarkEventAsInterested(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/events/1/interested/"),
        { method: "DELETE" },
      );
      expect(result).toEqual(mockResponseData);
    });

    it("should throw error when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ detail: "Not interested" }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(unmarkEventAsInterested(1)).rejects.toThrow(
        "Not interested",
      );
    });

    it("should throw default error when response has no detail", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({}),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(unmarkEventAsInterested(1)).rejects.toThrow(
        "Failed to unmark event as interested",
      );
    });
  });

  describe("getInterestedEvents", () => {
    it("should return events array on success", async () => {
      const mockEvents = [
        { id: 1, name: "Event 1", date: "2024-01-01", category: "SOCIAL" },
        { id: 2, name: "Event 2", date: "2024-01-02", category: "ACADEMIC" },
      ];

      const mockResponse = {
        ok: true,
        json: async () => mockEvents,
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await getInterestedEvents();

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/events/interested/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockEvents);
    });

    it("should return results array when response has results property", async () => {
      const mockEvents = [
        { id: 1, name: "Event 1", date: "2024-01-01", category: "SOCIAL" },
      ];

      const mockResponse = {
        ok: true,
        json: async () => ({ results: mockEvents }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      const result = await getInterestedEvents();

      expect(result).toEqual(mockEvents);
    });

    it("should throw error when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ detail: "Unauthorized" }),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(getInterestedEvents()).rejects.toThrow("Unauthorized");
    });

    it("should throw default error when response has no detail", async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({}),
      } as Response;

      mockFetchWithAuth.mockResolvedValue(mockResponse);

      await expect(getInterestedEvents()).rejects.toThrow(
        "Failed to fetch interested events",
      );
    });
  });
});

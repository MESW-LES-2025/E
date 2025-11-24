import "@testing-library/jest-dom";
import { getProfile, updateProfile } from "../../lib/profiles";
import { fetchWithAuth } from "../../lib/auth";

// Mock the auth module
jest.mock("../../lib/auth", () => ({
  fetchWithAuth: jest.fn(),
}));

const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<
  typeof fetchWithAuth
>;

describe("Profiles API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("getProfile", () => {
    it("should fetch and return profile data", async () => {
      const mockProfile = {
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE" as const,
        phone_number: "123456789",
        bio: "Test bio",
        participating_events: [1, 2],
      };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const result = await getProfile();

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/profile/me/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockProfile);
    });

    it("should throw error with session expired message on 401", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Invalid token" }),
      } as Response);

      await expect(getProfile()).rejects.toThrow(
        "Session expired. Please log in again.",
      );
    });

    it("should throw error with session expired message on 403", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Forbidden" }),
      } as Response);

      await expect(getProfile()).rejects.toThrow(
        "Session expired. Please log in again.",
      );
    });

    it("should throw error with detail message on other errors", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Server error" }),
      } as Response);

      await expect(getProfile()).rejects.toThrow("Server error");
    });

    it("should handle missing error detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(getProfile()).rejects.toThrow("Failed to fetch profile");
    });
  });

  describe("updateProfile", () => {
    it("should update profile with valid payload", async () => {
      const mockPayload = {
        phone_number: "987654321",
        bio: "Updated bio",
      };

      const mockUpdatedProfile = {
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE" as const,
        phone_number: "987654321",
        bio: "Updated bio",
        participating_events: [1, 2],
      };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedProfile,
      } as Response);

      const result = await updateProfile(mockPayload);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/profile/me/"),
        {
          method: "PATCH",
          body: JSON.stringify(mockPayload),
        },
      );
      expect(result).toEqual(mockUpdatedProfile);
    });

    it("should throw error on failed update", async () => {
      const mockPayload = { phone_number: "123" };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Invalid phone number" }),
      } as Response);

      await expect(updateProfile(mockPayload)).rejects.toThrow(
        "Invalid phone number",
      );
    });

    it("should handle missing error detail", async () => {
      const mockPayload = { bio: "Test" };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(updateProfile(mockPayload)).rejects.toThrow(
        "Failed to update profile",
      );
    });
  });
});

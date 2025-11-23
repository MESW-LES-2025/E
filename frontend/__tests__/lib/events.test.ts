import { cancelEventRequest, uncancelEventRequest } from "../../lib/events";
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
});

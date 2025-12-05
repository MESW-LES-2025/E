/**
 * @jest-environment jsdom
 */

import { cn, apiRequest } from "@/lib/utils";
import { getAuthToken } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getAuthToken: jest.fn(),
}));

const OLD_ENV = process.env;

describe("utils.ts", () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Provide test environment variable
    process.env = {
      ...OLD_ENV,
      NEXT_PUBLIC_API_BASE_URL: "https://example.com/api",
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  // -------------------------------
  // TEST: cn()
  // -------------------------------
  test("cn merges class names", () => {
    expect(cn("px-2", "text-lg")).toBe("px-2 text-lg");
  });

  test("cn merges tailwind classes correctly", () => {
    expect(cn("p-2", "p-4")).toBe("p-4"); // twMerge keeps last
  });

  // -------------------------------
  // TEST: apiRequest()
  // -------------------------------
  test("apiRequest calls fetch with correct parameters for GET", async () => {
    (getAuthToken as jest.Mock).mockResolvedValue("test-token");

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response); // cast as Response
    global.fetch = mockFetch as unknown as typeof fetch; // <-- fix

    await apiRequest("events/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/api/events/1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  test("apiRequest includes JSON body and content-type when body is provided", async () => {
    (getAuthToken as jest.Mock).mockResolvedValue(null);

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);
    global.fetch = mockFetch as unknown as typeof fetch;

    await apiRequest("events", "POST", { name: "New Event" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/api/events",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ name: "New Event" }),
      }),
    );
  });

  test("apiRequest merges custom headers", async () => {
    (getAuthToken as jest.Mock).mockResolvedValue("secret");

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);
    global.fetch = mockFetch as unknown as typeof fetch;

    await apiRequest("events", "GET", undefined, {
      "X-Test": "123",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/api/events",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer secret",
          "X-Test": "123",
        }),
      }),
    );
  });
});

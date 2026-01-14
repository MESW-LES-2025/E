import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import EventsPage from "@/app/events/page";

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("Events Page", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress expected console.error messages
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should display error message on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load events/i)).toBeInTheDocument();
    });
  });
});

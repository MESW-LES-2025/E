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

  it("should display upcoming events section", async () => {
    const mockUpcomingEvents = {
      results: [
        {
          id: 1,
          name: "Upcoming Event 1",
          date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          location: "Location 1",
          status: "Active",
        },
        {
          id: 2,
          name: "Upcoming Event 2",
          date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          location: "Location 2",
          status: "Active",
        },
      ],
    };

    const mockPastEvents = {
      results: [],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpcomingEvents,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPastEvents,
      } as Response);

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
      expect(screen.getByText("Upcoming Event 1")).toBeInTheDocument();
      expect(screen.getByText("Upcoming Event 2")).toBeInTheDocument();
    });
  });

  it("should display past events section", async () => {
    const mockUpcomingEvents = {
      results: [],
    };

    const mockPastEvents = {
      results: [
        {
          id: 3,
          name: "Past Event 1",
          date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          location: "Location 3",
          status: "Active",
        },
        {
          id: 4,
          name: "Past Event 2",
          date: new Date(Date.now() - 172800000).toISOString(), // Day before yesterday
          location: "Location 4",
          status: "Active",
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpcomingEvents,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPastEvents,
      } as Response);

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Past Events")).toBeInTheDocument();
      expect(screen.getByText("Past Event 1")).toBeInTheDocument();
      expect(screen.getByText("Past Event 2")).toBeInTheDocument();
    });
  });

  it("should show empty states when no events", async () => {
    const mockEmptyResponse = {
      results: [],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse,
      } as Response);

    render(<EventsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No upcoming events are available/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No past events are available/i),
      ).toBeInTheDocument();
    });
  });

  it("should display error message on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it("should display both sections with events", async () => {
    const mockUpcomingEvents = {
      results: [
        {
          id: 1,
          name: "Upcoming Event",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Location 1",
          status: "Active",
        },
      ],
    };

    const mockPastEvents = {
      results: [
        {
          id: 2,
          name: "Past Event",
          date: new Date(Date.now() - 86400000).toISOString(),
          location: "Location 2",
          status: "Active",
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpcomingEvents,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPastEvents,
      } as Response);

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
      expect(screen.getByText("Past Events")).toBeInTheDocument();
      expect(screen.getByText("Upcoming Event")).toBeInTheDocument();
      expect(screen.getByText("Past Event")).toBeInTheDocument();
    });
  });
});

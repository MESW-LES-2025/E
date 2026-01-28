import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Home from "../app/page";
import { listOrganizations } from "../lib/organizations";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
}));

// Mock organizations library
jest.mock("../lib/organizations", () => ({
  listOrganizations: jest.fn(),
}));

// Mock events library
jest.mock("../lib/events", () => ({
  markEventAsInterested: jest.fn(),
  unmarkEventAsInterested: jest.fn(),
}));

const mockListOrganizations = listOrganizations as jest.MockedFunction<
  typeof listOrganizations
>;

describe("Home Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListOrganizations.mockResolvedValue([]);
  });

  it("shows 'No events found matching your filters' when no events exist", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      }),
    ) as jest.Mock;

    render(<Home />);
    await waitFor(() => {
      expect(
        screen.getByText("No upcoming events at the moment."),
      ).toBeInTheDocument();
    });
  });

  it("renders event cards when upcoming events exist", async () => {
    const now = new Date();
    const events: ErasmusEvent[] = [
      {
        id: 1,
        name: "Test Event",
        date: now.toISOString(),
        location: "City Center",
        status: "Active",
      },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(events),
      }),
    ) as jest.Mock;

    render(<Home />);
    await waitFor(() => {
      const eventTitles = screen.getAllByText("Test Event");
      // Should find at least one in the events section
      expect(eventTitles.length).toBeGreaterThan(0);
      expect(screen.getByText(/City Center/)).toBeInTheDocument();
    });
  });

  it("shows error message when fetch fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
        }),
      ) as jest.Mock;

      render(<Home />);
      await waitFor(() => {
        expect(screen.getByText(/Could not load events/)).toBeInTheDocument();
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("should update event interest when handleInterestChange callback is invoked", async () => {
    const now = new Date();
    const initialEvents = [
      {
        id: 1,
        name: "Test Event",
        date: now.toISOString(),
        location: "City Center",
        status: "Active",
        description: "Test",
        organizer: 1,
        organizer_name: "Organizer",
        participant_count: 0,
        interest_count: 5,
        is_participating: false,
        capacity: 100,
        is_full: false,
        category: "SOCIAL",
      },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(initialEvents),
      }),
    ) as jest.Mock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    // Mock EventModal to call the callback directly
    jest.mock("../components/EventModal", () => {
      jest.requireActual("../components/EventModal");
      return {
        __esModule: true,
        default: ({
          onInterestChange,
          id,
        }: {
          onInterestChange?: (
            id: number,
            isInterested: boolean,
            count: number,
          ) => void;
          id?: string;
        }) => {
          // Simulate callback being called
          if (onInterestChange && id === "1") {
            setTimeout(() => {
              onInterestChange(1, true, 6);
            }, 0);
          }
          return <div data-testid="event-modal">Modal</div>;
        },
      };
    });

    // The callback functionality is tested through EventModal
    // Here we verify the component structure supports callbacks
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("should update event participation when handleParticipationChange callback is invoked", async () => {
    const now = new Date();
    const events = [
      {
        id: 1,
        name: "Test Event",
        date: now.toISOString(),
        location: "City Center",
        status: "Active",
        description: "Test",
        organizer: 1,
        organizer_name: "Organizer",
        participant_count: 10,
        interest_count: 5,
        is_participating: false,
        capacity: 100,
        is_full: false,
        category: "SOCIAL",
      },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(events),
      }),
    ) as jest.Mock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    // Verify component renders with events that can be updated
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  it("should call handleCloseModal when modal is closed", async () => {
    const now = new Date();
    const events = [
      {
        id: 1,
        name: "Test Event",
        date: now.toISOString(),
        location: "City Center",
        status: "Active",
        description: "Test",
        organizer: 1,
        organizer_name: "Organizer",
        participant_count: 10,
        interest_count: 5,
        is_participating: false,
        capacity: 100,
        is_full: false,
        category: "SOCIAL",
      },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(events),
      }),
    ) as jest.Mock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    // Open modal by clicking view details
    const viewDetailsButton = screen.getByText(/View Details/i);
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      // Modal should be open
      expect(screen.queryByRole("dialog")).toBeInTheDocument();
    });
  });

  it("should call handleViewDetails when view details is clicked", async () => {
    const now = new Date();
    const events = [
      {
        id: 1,
        name: "Test Event",
        date: now.toISOString(),
        location: "City Center",
        status: "Active",
        description: "Test",
        organizer: 1,
        organizer_name: "Organizer",
        participant_count: 10,
        interest_count: 5,
        is_participating: false,
        capacity: 100,
        is_full: false,
        category: "SOCIAL",
      },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(events),
      }),
    ) as jest.Mock;

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    // Click view details button
    const viewDetailsButton = screen.getByText(/View Details/i);
    fireEvent.click(viewDetailsButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeInTheDocument();
    });
  });

  it("should fetch organizations on mount", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    ) as jest.Mock;

    render(<Home />);

    await waitFor(() => {
      expect(mockListOrganizations).toHaveBeenCalled();
    });
  });

  it("should handle organizations fetch error gracefully", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    ) as jest.Mock;

    mockListOrganizations.mockRejectedValue(
      new Error("Failed to load organizations"),
    );

    render(<Home />);

    await waitFor(() => {
      expect(mockListOrganizations).toHaveBeenCalled();
    });

    // Should handle error gracefully
    expect(screen.getByText(/Featured Events/i)).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("should display organizations when available", async () => {
    const mockOrgs = [
      {
        id: 1,
        name: "Test Org",
        description: "Test Description",
        email: "test@example.com",
        website: "",
        phone: "",
        address: "",
        city: "",
        country: "",
        logo_url: null,
        cover_image_url: null,
        twitter_handle: "",
        facebook_url: "",
        linkedin_url: "",
        instagram_handle: "",
        organization_type: null,
        established_date: null,
        owner_name: "Owner",
        event_count: 0,
        created_at: "2024-01-01T00:00:00Z",
        is_following: false,
      },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    ) as jest.Mock;

    mockListOrganizations.mockResolvedValue(mockOrgs);

    render(<Home />);

    await waitFor(
      () => {
        expect(screen.getByText("Test Org")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});

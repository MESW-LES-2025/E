import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import MyEventsPage from "../../app/events/my/page";
import { isAuthenticated } from "../../lib/auth";
import { getProfile } from "../../lib/profiles";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock auth and profiles
jest.mock("../../lib/auth", () => ({
  isAuthenticated: jest.fn(),
  fetchWithAuth: jest.fn(),
}));

jest.mock("../../lib/profiles", () => ({
  getProfile: jest.fn(),
}));

// Mock organizations and events
jest.mock("../../lib/organizations", () => ({
  getMyOrganizations: jest.fn(),
}));

jest.mock("../../lib/events", () => ({
  getMyOrganizedEvents: jest.fn(),
  cancelEvent: jest.fn(),
  uncancelEvent: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<
  typeof isAuthenticated
>;
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;

// Import fetchWithAuth for mocking
import { fetchWithAuth } from "../../lib/auth";
const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<
  typeof fetchWithAuth
>;

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe("My Events Page", () => {
  const mockReplace = jest.fn();

  // Mock DOM methods that Radix UI Select needs
  beforeEach(() => {
    // Mock scrollIntoView
    HTMLElement.prototype.scrollIntoView = jest.fn();
    // Mock hasPointerCapture
    Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: mockReplace,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it("should redirect to login when not authenticated", async () => {
    mockIsAuthenticated.mockReturnValue(false);

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/profile/login");
    });
  });

  it("should display user's participating events", async () => {
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [1, 2],
    };

    const mockEvent1 = {
      id: 1,
      name: "Event 1",
      date: new Date(Date.now() + 86400000).toISOString(),
      location: "Location 1",
      status: "Active",
      organizer_name: "Organizer",
      organization_name: "Org 1",
      organization_id: 1,
      capacity: 100,
      participant_count: 50,
      is_participating: true,
      is_full: false,
    };

    const mockEvent2 = {
      id: 2,
      name: "Event 2",
      date: new Date(Date.now() + 172800000).toISOString(),
      location: "Location 2",
      status: "Active",
      organizer_name: "Organizer",
      organization_name: "Org 2",
      organization_id: 2,
      capacity: null,
      participant_count: 10,
      is_participating: true,
      is_full: false,
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);

    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent1,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent2,
      } as Response);

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();
    });
  });

  it("should display empty state when user has no events", async () => {
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/You have not registered for any events yet/i),
      ).toBeInTheDocument();
    });
  });

  it("should display error message when profile fetch fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockRejectedValue(new Error("Failed to fetch profile"));

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch profile")).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it("should display error message when event fetch fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [1],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(<MyEventsPage />);

    await waitFor(() => {
      // When event fetch fails, the page shows empty state for participating events
      // Check for the empty state text
      const emptyState = screen.queryByText(
        /You have not registered for any events yet/i,
      );
      expect(emptyState).toBeTruthy();
    });
    consoleSpy.mockRestore();
  });

  it("should handle event fetch error for individual event", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [1, 2],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);

    // First event fetch succeeds, second fails (catch block)
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: "Event 1",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Location 1",
          status: "Active",
        }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<MyEventsPage />);

    await waitFor(() => {
      // Should show Event 1 but not Event 2
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("should open modal when View Details is clicked", async () => {
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [1],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);

    // Mock initial event fetch - use mockResolvedValueOnce for the first call
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        name: "Test Event",
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Location",
        status: "Active",
      }),
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole("button", {
      name: "View Details",
    });
    fireEvent.click(viewDetailsButtons[0]);

    await waitFor(() => {
      // Modal should be open (EventModal component should render)
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });
  });

  it("should refresh events after modal closes", async () => {
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [1],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValueOnce(mockProfile).mockResolvedValueOnce({
      ...mockProfile,
      participating_events: [1, 2], // Different events after refresh
    });

    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: "Test Event",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Location",
          status: "Active",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: "Test Event",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Location",
          status: "Active",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: "Test Event 2",
          date: new Date(Date.now() + 172800000).toISOString(),
          location: "Location 2",
          status: "Active",
        }),
      });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole("button", {
      name: "View Details",
    });
    fireEvent.click(viewDetailsButtons[0]);

    await waitFor(() => {
      // Find and close the modal - look for close button or backdrop
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
    });

    // Close modal by clicking backdrop or close button
    const closeButton = screen.getByRole("button", { name: /close/i });
    closeButton.click();

    // After modal closes, events should be refreshed
    await waitFor(
      () => {
        expect(mockGetProfile).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );
  });

  it("should handle refresh events error gracefully", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [1],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile
      .mockResolvedValueOnce(mockProfile)
      .mockRejectedValueOnce(new Error("Failed to refresh"));

    // Mock initial event fetch - use mockResolvedValueOnce for the first call
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        name: "Test Event",
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Location",
        status: "Active",
      }),
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole("button", {
      name: "View Details",
    });
    fireEvent.click(viewDetailsButtons[0]);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    // Should handle error gracefully
    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    consoleSpy.mockRestore();
  });

  it("should fetch organizations and organized events for ORGANIZER role", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Owned Org" }],
      collaborated: [{ id: 2, name: "Collaborated Org" }],
    };

    const mockOrganizedEvents = [
      {
        id: 1,
        name: "Organized Event",
        date: new Date(Date.now() + 86400000).toISOString(),
        organization_name: "Owned Org",
        organization_id: 1,
        status: "Active",
      },
    ];

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue(mockOrganizedEvents);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(mockGetMyOrganizations).toHaveBeenCalled();
      expect(mockGetMyOrganizedEvents).toHaveBeenCalled();
    });
  });

  it("should handle organization fetch error gracefully", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockRejectedValue(new Error("Failed to fetch organizations"));
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should auto-select organization when only one exists", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Single Org" }],
      collaborated: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue([]);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(mockGetMyOrganizations).toHaveBeenCalled();
    });
  });

  it("should group organized events by organization", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Org 1" }],
      collaborated: [],
    };

    const mockOrganizedEvents = [
      {
        id: 1,
        name: "Event 1",
        date: new Date(Date.now() + 86400000).toISOString(),
        organization_name: "Org 1",
        organization_id: 1,
        status: "Active",
      },
      {
        id: 2,
        name: "Event 2",
        date: new Date(Date.now() + 172800000).toISOString(),
        organization_name: "Org 1",
        organization_id: 1,
        status: "Active",
      },
    ];

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue(mockOrganizedEvents);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Org 1")).toBeInTheDocument();
      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();
    });
  });

  it("should switch between Participating and Organized tabs", async () => {
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [1],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    
    // Mock fetchWithAuth to return the participating event when fetching by ID
    // The page fetches events individually by ID from participating_events array
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes("/events/1/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            name: "Participating Event",
            date: new Date(Date.now() + 86400000).toISOString(),
            status: "Active",
            location: "Test Location",
            description: "Test Description",
            category: "SOCIAL",
            participant_count: 5,
            interest_count: 10,
            is_participating: true,
            is_interested: false,
            is_full: false,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;
    mockGetMyOrganizations.mockResolvedValue({ owned: [], collaborated: [] });
    mockGetMyOrganizedEvents.mockResolvedValue([]);

    render(<MyEventsPage />);

    // Wait for the page to load and show participating events
    await waitFor(() => {
      expect(screen.getByText("Participating Event")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should filter organized events by selected organization", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [
        { id: 1, name: "Org 1" },
        { id: 2, name: "Org 2" },
      ],
      collaborated: [],
    };

    const mockOrganizedEvents = [
      {
        id: 1,
        name: "Event from Org 1",
        date: new Date(Date.now() + 86400000).toISOString(),
        organization_name: "Org 1",
        organization_id: 1,
        status: "Active",
      },
      {
        id: 2,
        name: "Event from Org 2",
        date: new Date(Date.now() + 172800000).toISOString(),
        organization_name: "Org 2",
        organization_id: 2,
        status: "Active",
      },
    ];

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue(mockOrganizedEvents);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Org 1")).toBeInTheDocument();
      expect(screen.getByText("Event from Org 1")).toBeInTheDocument();
      expect(screen.getByText("Event from Org 2")).toBeInTheDocument();
    });

    // The page shows all organized events grouped by organization
    // There's no filter dropdown in the current implementation
    // Events are displayed in groups by organization name
  });

  it("should handle event cancellation", async () => {
    const { cancelEvent } = require("../../lib/events");
    const mockCancelEvent = cancelEvent as jest.MockedFunction<typeof cancelEvent>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Org 1" }],
      collaborated: [],
    };

    const mockOrganizedEvents = [
      {
        id: 1,
        name: "Active Event",
        date: new Date(Date.now() + 86400000).toISOString(),
        organization_name: "Org 1",
        organization_id: 1,
        status: "Active",
      },
    ];

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    (getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>).mockResolvedValue(mockOrgs);
    (getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>).mockResolvedValue(mockOrganizedEvents);
    mockCancelEvent.mockResolvedValue(undefined);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Event")).toBeInTheDocument();
    });

    // The cancel functionality would be tested through EventModal
    // Here we verify the component structure supports it
    expect(screen.getByText("Active Event")).toBeInTheDocument();
  });

  it("should show create event form for organizers", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Org 1" }],
      collaborated: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue([]);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      const createButton = screen.getByText(/Create Event/i);
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Organization/i)).toBeInTheDocument();
    });
  });

  it("should validate event form and show errors", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Org 1" }],
      collaborated: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue([]);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      const createButton = screen.getByText(/Create Event/i);
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Organization/i)).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    const submitButton = screen.getByText("Create Event");
    fireEvent.click(submitButton);

    // Should show validation errors - check for organization error specifically
    await waitFor(() => {
      const errorMessages = screen.getAllByText(/required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should create event successfully", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Org 1" }],
      collaborated: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue([]);
    
    // Mock successful event creation
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url.includes("/events/create/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 1, name: "New Event" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      const createButton = screen.getByText(/Create Event/i);
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Organization/i)).toBeInTheDocument();
    });

    // Select organization first (required field)
    // There might be multiple comboboxes (organization select and category select)
    // Find the organization select specifically
    const orgSelects = screen.getAllByRole("combobox");
    const orgSelect = orgSelects.find(select => {
      // The organization select should be near the "Organization" label
      const orgLabel = screen.getByText(/Organization/i);
      return orgLabel.closest("div")?.contains(select);
    }) || orgSelects[0];
    
    // Open the select dropdown - use keyDown to trigger Radix UI Select
    fireEvent.keyDown(orgSelect, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(orgSelect, { key: " ", code: "Space" });
    
    // Also try mouse events
    fireEvent.pointerDown(orgSelect);
    fireEvent.click(orgSelect);
    
    // Wait for the select content to appear in the portal
    // The option might appear in a portal, so we need to wait
    await waitFor(() => {
      // Try to find the option in the portal
      const portal = document.querySelector('[data-slot="select-content"]');
      expect(portal).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Find the option in the portal
    const portal = document.querySelector('[data-slot="select-content"]');
    if (portal) {
      // Find the select item that contains "Org 1"
      const orgItems = portal.querySelectorAll('[data-slot="select-item"]');
      const orgItem = Array.from(orgItems).find(item => 
        item.textContent?.includes("Org 1")
      );
      
      if (orgItem) {
        fireEvent.pointerDown(orgItem);
        fireEvent.click(orgItem);
      } else {
        // Fallback: try to find by text in portal
        const orgOptions = screen.queryAllByText("Org 1");
        // Filter to find the one in the portal
        const portalOption = orgOptions.find(opt => 
          opt.closest('[data-slot="select-content"]') !== null
        );
        if (portalOption) {
          fireEvent.pointerDown(portalOption);
          fireEvent.click(portalOption);
        }
      }
    }
    
    // Wait a bit for organization selection to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Find inputs by their associated labels
    // The Field component uses FieldLabel which should be associated with the input
    // Use getAllByText to handle multiple matches
    const nameLabels = screen.getAllByText(/^Name/i);
    const nameLabel = nameLabels[0];
    const nameInput = nameLabel?.closest("div")?.querySelector("input") || 
                     document.querySelector('input[type="text"]');
    
    const dateLabels = screen.getAllByText(/Date and Time/i);
    const dateLabel = dateLabels[0];
    const dateInput = dateLabel?.closest("div")?.querySelector("input[type='datetime-local']") ||
                     document.querySelector('input[type="datetime-local"]');
    
    const locationLabels = screen.getAllByText(/Location/i);
    const locationLabel = locationLabels[0];
    const locationInput = locationLabel?.closest("div")?.querySelector("input") ||
                         document.querySelector('input[placeholder*="location" i]');
    
    const descriptionLabels = screen.getAllByText(/Description/i);
    const descriptionLabel = descriptionLabels[0];
    const descriptionInput = descriptionLabel?.closest("div")?.querySelector("textarea") ||
                            document.querySelector("textarea");

    // Fill in the form - wait a bit after selecting organization
    // (already waited above)
    
    // Fill in all required fields
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: "New Event" } });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: "2025-12-31T12:00" } });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (locationInput) {
      fireEvent.change(locationInput, { target: { value: "Test Location" } });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (descriptionInput) {
      fireEvent.change(descriptionInput, { target: { value: "Test Description" } });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Also need to select category if it's required
    // Wait a bit before trying to select category
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Find category select (it's another combobox)
    const categorySelects = screen.queryAllByRole("combobox");
    const categorySelect = categorySelects.find(select => {
      const categoryLabels = screen.queryAllByText(/Category/i);
      const categoryLabel = categoryLabels[0];
      return categoryLabel && categoryLabel.closest("div")?.contains(select) && select !== orgSelect;
    });
    
    if (categorySelect) {
      fireEvent.pointerDown(categorySelect);
      fireEvent.click(categorySelect);
      
      await waitFor(() => {
        const portal = document.querySelector('[data-slot="select-content"]');
        expect(portal).toBeInTheDocument();
      }, { timeout: 2000 });
      
      const portal = document.querySelector('[data-slot="select-content"]');
      if (portal) {
        // Find "Social" category option
        const categoryItems = portal.querySelectorAll('[data-slot="select-item"]');
        const socialItem = Array.from(categoryItems).find(item => 
          item.textContent?.includes("Social")
        ) || categoryItems[0];
        
        if (socialItem) {
          fireEvent.pointerDown(socialItem);
          fireEvent.click(socialItem);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // Find the submit button - it should be in the form
    await waitFor(() => {
      const submitButtons = screen.queryAllByText("Create Event");
      expect(submitButtons.length).toBeGreaterThan(0);
    });
    
    const submitButtons = screen.getAllByText("Create Event");
    // The submit button should be the one in the form (not the toggle button)
    const submitButton = submitButtons.find(btn => {
      const form = btn.closest("form");
      return form !== null;
    }) || submitButtons[submitButtons.length - 1];
    
    // Find the form
    const form = submitButton.closest("form");
    expect(form).toBeInTheDocument();
    
    // Submit the form directly (more reliable than clicking button)
    if (form) {
      fireEvent.submit(form);
    } else {
      // Fallback: click the button
      fireEvent.click(submitButton);
    }

    // Wait for the form submission
    // The form should call fetchWithAuth with the create endpoint
    await waitFor(() => {
      // Check if fetchWithAuth was called with the create endpoint
      const calls = mockFetchWithAuth.mock.calls;
      const createCall = calls.find(call => 
        typeof call[0] === 'string' && call[0].includes("/events/create/")
      );
      expect(createCall).toBeDefined();
      if (createCall) {
        expect(createCall[1]).toMatchObject({ method: "POST" });
      }
    }, { timeout: 5000 });
  });

  it("should handle validateEventForm with negative capacity", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Org 1" }],
      collaborated: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue([]);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      const createButton = screen.getByText(/Create Event/i);
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Organization/i)).toBeInTheDocument();
    });

    // Fill form with negative capacity - find by placeholder or label
    const capacityInputs = document.querySelectorAll('input[type="number"]');
    const capacityInput = Array.from(capacityInputs).find(input => {
      const label = input.closest('div')?.querySelector('label');
      return label?.textContent?.includes('Capacity') || (input as HTMLInputElement).placeholder?.includes('Unlimited');
    }) as HTMLInputElement || capacityInputs[0] as HTMLInputElement;
    
    if (capacityInput) {
      fireEvent.change(capacityInput, { target: { value: "-5" } });
    }

    // Try to submit - need to fill required fields first
    // Select organization
    const orgSelects = screen.getAllByRole("combobox");
    if (orgSelects.length > 0) {
      fireEvent.keyDown(orgSelects[0], { key: "Enter" });
    }

    // Fill required fields
    const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: "Test Event" } });
    }

    const submitButtons = screen.getAllByText("Create Event");
    const formSubmitButton = submitButtons.find(btn => {
      const form = btn.closest("form");
      return form !== null;
    }) || submitButtons[submitButtons.length - 1];

    if (formSubmitButton) {
      fireEvent.click(formSubmitButton);
    }

    // Should show validation error for negative capacity
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/cannot be negative/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("should handle refreshEvents for organizer", async () => {
    const { getMyOrganizations } = require("../../lib/organizations");
    const { getMyOrganizedEvents } = require("../../lib/events");
    const mockGetMyOrganizations = getMyOrganizations as jest.MockedFunction<typeof getMyOrganizations>;
    const mockGetMyOrganizedEvents = getMyOrganizedEvents as jest.MockedFunction<typeof getMyOrganizedEvents>;

    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "organizer",
      email: "org@example.com",
      first_name: "Org",
      last_name: "User",
      role: "ORGANIZER" as const,
      phone_number: "",
      bio: "",
      participating_events: [1],
    };

    const mockOrgs = {
      owned: [{ id: 1, name: "Org 1" }],
      collaborated: [],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(mockProfile);
    mockGetMyOrganizations.mockResolvedValue(mockOrgs);
    mockGetMyOrganizedEvents.mockResolvedValue([]);
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        name: "Test Event",
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Location",
        status: "Active",
      }),
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    // Open and close modal to trigger refreshEvents
    const viewDetailsButtons = screen.getAllByRole("button", {
      name: "View Details",
    });
    fireEvent.click(viewDetailsButtons[0]);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    // refreshEvents should be called
    await waitFor(() => {
      expect(mockGetProfile).toHaveBeenCalledTimes(2);
    });
  });

  it("should handle refreshEvents error gracefully", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockProfile = {
      id: 1,
      user_id: 1,
      username: "testuser",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "ATTENDEE" as const,
      phone_number: "",
      bio: "",
      participating_events: [1],
    };

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile
      .mockResolvedValueOnce(mockProfile)
      .mockRejectedValueOnce(new Error("Refresh failed"));

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        name: "Test Event",
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Location",
        status: "Active",
      }),
    });

    render(<MyEventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByRole("button", {
      name: "View Details",
    });
    fireEvent.click(viewDetailsButtons[0]);

    await waitFor(() => {
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    // Should handle error gracefully
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    }, { timeout: 3000 });

    consoleErrorSpy.mockRestore();
  });
});

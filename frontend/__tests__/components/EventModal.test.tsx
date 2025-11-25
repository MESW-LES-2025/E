import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventModal from "../../components/EventModal";
import { fetchWithAuth } from "../../lib/auth";
import {
  cancelEventRequest,
  getEventParticipants,
  uncancelEventRequest,
} from "../../lib/events";

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPathname = "/";
const mockQuery = {};

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    pathname: mockPathname,
    query: mockQuery,
  }),
  usePathname: () => mockPathname,
  useParams: () => mockQuery,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock getProfile
jest.mock("../../lib/profiles", () => ({
  getProfile: jest.fn().mockResolvedValue({ role: "ATTENDEE" }),
}));

// Mock getOrganization
jest.mock("../../lib/organizations", () => ({
  getOrganization: jest.fn().mockResolvedValue({
    id: 1,
    name: "Test Organization",
    is_following: false,
  }),
}));

// Mock auth module
jest.mock("../../lib/auth", () => ({
  fetchWithAuth: jest.fn(),
  isAuthenticated: jest.fn().mockReturnValue(false),
}));
jest.mock("../../lib/events", () => ({
  getEventParticipants: jest.fn(),
  cancelEventRequest: jest.fn(),
  uncancelEventRequest: jest.fn(),
}));

const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<
  typeof fetchWithAuth
>;

describe("EventModal", () => {
  const mockOnClose = jest.fn();
  const mockGetEventParticipants = getEventParticipants as jest.Mock;
  const mockCancelEventRequest = cancelEventRequest as jest.Mock;
  const mockUncancelEventRequest = uncancelEventRequest as jest.Mock;

  const mockEvent = {
    id: 1,
    name: "Test Event",
    date: "2024-12-25T10:00:00Z",
    location: "Test Location",
    description: "Test Description",
    organizer: 1,
    organizer_name: "Test Organizer",
    organization: 1,
    organization_id: 1,
    organization_name: "Test Organization",
    status: "Active",
    participant_count: 2,
    capacity: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000/api";
    mockGetEventParticipants.mockClear();
    mockCancelEventRequest.mockClear();
    mockUncancelEventRequest.mockClear();
    mockFetchWithAuth.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when id is null", () => {
      const { container } = render(
        <EventModal id={null} onClose={mockOnClose} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render modal when id is provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
    });

    it("should display loading state initially", () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}), // Never resolves
      );

      render(<EventModal id="1" onClose={mockOnClose} />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("should fetch and display event data successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test Event")).toBeInTheDocument();
      });

      expect(screen.getByText("Test Location")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
      expect(screen.getByText(mockEvent.organization_name)).toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/events/1/",
      );
    });

    it("should handle fetch error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
        expect(screen.getByText(/Status 404/)).toBeInTheDocument();
      });
    });

    it("should handle network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it("should use fallback API URL when env var is not set", async () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:8000/api/events/1/",
        );
      });
    });
  });

  describe("User Interactions", () => {
    it("should call onClose when close button is clicked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText("Close modal");
      await screen.findByText(mockEvent.name); // Wait for content to load
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when backdrop is clicked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      const backdrop = screen.getByRole("dialog");
      await screen.findByText(mockEvent.name); // Wait for content to load
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not close when modal content is clicked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Test Event")).toBeInTheDocument();
      });

      const modalContent = screen.getByText(mockEvent.name).parentElement;
      if (modalContent) {
        fireEvent.click(modalContent);
      }

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when other keys are pressed", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyDown(window, { key: "a" });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Event Data Display", () => {
    it("should format date correctly", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("25/12/2024, 10:00")).toBeInTheDocument();
      });
    });

    it("should handle missing optional fields", async () => {
      const eventWithoutOptionals = {
        id: 1,
        name: "Minimal Event",
        date: "",
        location: "",
        description: "",
        organizer: undefined,
        organizer_name: undefined,
      };
      delete (eventWithoutOptionals as Partial<typeof mockEvent>).status;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => eventWithoutOptionals,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Minimal Event")).toBeInTheDocument();
      });

      expect(screen.getByText("N/A")).toBeInTheDocument();
      expect(screen.queryByText("Location")).not.toBeInTheDocument();
      expect(screen.queryByText("Description")).not.toBeInTheDocument();
      expect(screen.queryByText("Organization")).not.toBeInTheDocument(); // organization_name is null
      expect(screen.queryByText("Active")).not.toBeInTheDocument();
    });

    it("should display status with green background for 'Active'", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockEvent, status: "Active" }),
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        const statusElement = screen.getByText("Active");
        expect(statusElement).toBeInTheDocument();
        expect(statusElement).toHaveClass("bg-green-500");
      });
    });

    it("should display status with red background for other statuses (e.g., 'Cancelled')", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockEvent, status: "Cancelled" }),
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        const statusElement = screen.getByText("Cancelled");
        expect(statusElement).toBeInTheDocument();
        expect(statusElement).toHaveClass("bg-red-500");
      });
    });

    it("should place organization before description", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });
      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      const organization = screen.getByText(mockEvent.organization_name);
      const description = screen.getByText("Test Description");
      expect(organization.compareDocumentPosition(description)).toBe(4); // Node.DOCUMENT_POSITION_FOLLOWING
    });
  });

  describe("Cleanup", () => {
    it("should cleanup event listener on unmount", async () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      const { unmount } = render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });

    it("should not update state after component unmounts", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      let resolveFetch: (value: object) => void;
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => (resolveFetch = resolve)),
      );

      const { unmount } = render(<EventModal id="1" onClose={mockOnClose} />);

      unmount();

      resolveFetch!({
        ok: true,
        json: async () => mockEvent,
      });

      await waitFor(() => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Participants Section", () => {
    it("should not show the Participants section when user is not authenticated", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(
        screen.queryByRole("button", { name: /Participants/i }),
      ).not.toBeInTheDocument();
    });

    it("should show the Participants section header when user is the event organizer", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockEvent, organizer: 1 }), // organizer is 1
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }), // user is organizer 1
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", { name: /Participants/i }),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
      expect(
        screen.queryByText("Loading participants..."),
      ).not.toBeInTheDocument();
    });

    it("should NOT show the Participants section for a non-organizer authenticated user", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }), // User is an attendee
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      await waitFor(
        () => {
          expect(
            screen.queryByRole("button", { name: /Participants/i }),
          ).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("should fetch and display participants when section is opened by organizer", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent, // organizer is 1
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }), // user is organizer 1
        } as Response);
      // Mock participants fetch
      const mockParticipants = [
        {
          id: 101,
          username: "john.doe",
          first_name: "John",
          last_name: "Doe",
        },
        { id: 102, username: "jane.doe", first_name: "Jane", last_name: "Doe" },
      ];
      mockGetEventParticipants.mockResolvedValue(mockParticipants);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      // Wait for user data to load and Participants section to appear
      await waitFor(
        () => {
          expect(
            screen.getByRole("button", { name: /Participants/i }),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const participantsButton = screen.getByRole("button", {
        name: /Participants/i,
      });

      expect(participantsButton).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(participantsButton);
      expect(participantsButton).toHaveAttribute("aria-expanded", "true");

      // Check for loading state and participant count
      expect(screen.getByText("Loading participants...")).toBeInTheDocument();

      // Wait for participants to be displayed
      await waitFor(() => {
        expect(screen.getByText("John Doe (@john.doe)")).toBeInTheDocument();
        expect(screen.getByText("Jane Doe (@jane.doe)")).toBeInTheDocument();
      });

      // Check that loading state is gone
      expect(
        screen.queryByText("Loading participants..."),
      ).not.toBeInTheDocument();

      // Close the section
      fireEvent.click(participantsButton);
      await waitFor(() => {
        expect(
          screen.queryByText("John Doe (@john.doe)"),
        ).not.toBeInTheDocument();
      });
      expect(participantsButton).toHaveAttribute("aria-expanded", "false");
    });

    it("should display an error message if fetching participants fails", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }),
        } as Response);
      mockGetEventParticipants.mockRejectedValue(
        new Error("Failed to load participants."),
      );

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      const participantsButton = await screen.findByRole("button", {
        name: /Participants/i,
      });

      fireEvent.click(participantsButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load participants."),
        ).toBeInTheDocument();
      });
    });

    it("should display a message when there are no participants", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockEvent, participant_count: 0 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }),
        } as Response);
      mockGetEventParticipants.mockResolvedValue([]); // Empty array

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      const participantsButton = await screen.findByRole("button", {
        name: /Participants/i,
      });

      fireEvent.click(participantsButton);

      await waitFor(() => {
        expect(
          screen.getByText("No participants have registered yet."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Button Links", () => {
    it("should show Participate and Interested buttons when user is not authenticated", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      // Unauthenticated users should see Participate and Interested buttons
      const participateButton = screen.getByText("Participate");
      const interestedButton = screen.getByText("Interested");
      expect(participateButton).toBeInTheDocument();
      expect(interestedButton).toBeInTheDocument();

      // Should not show organizer buttons
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel Event")).not.toBeInTheDocument();
    });

    it("should NOT show Edit and Cancel buttons if user is an ORGANIZER but not the event's organizer", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent, // organizer is 1
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 99, role: "ORGANIZER" }), // An organizer, but not the event's organizer
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      // Wait for user data to load
      await waitFor(
        () => {
          expect(screen.queryByText("Login")).not.toBeInTheDocument();
          expect(screen.queryByText("Edit")).not.toBeInTheDocument();
          expect(screen.queryByText("Cancel Event")).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it('should show Participate and Interested buttons for an "ATTENDEE" user', async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent, // organizer is 1
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Participate")).toBeInTheDocument();
        expect(screen.getByText("Interested")).toBeInTheDocument();
      });
    });

    it('should NOT show Participate and Interested buttons for a non-"ATTENDEE" user', async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 99, role: "ORGANIZER" }), // Or any other type
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      await waitFor(
        () => {
          expect(screen.queryByText("Participate")).not.toBeInTheDocument();
          expect(screen.queryByText("Interested")).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("should show Edit and Cancel buttons if user is the event organizer", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent, // event.organizer is 1
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }), // User is organizer with ID 1
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      await waitFor(
        () => {
          expect(screen.getByText("Edit")).toBeInTheDocument();
          expect(screen.getByText("Cancel Event")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
      // Check that the Edit button links to the correct page
      expect(screen.getByText("Edit").closest("a")).toHaveAttribute(
        "href",
        `/events/edit/${mockEvent.id}`,
      );
    });
  });

  describe("Participation Features", () => {
    it("should display participant count and capacity when event has capacity", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventWithCapacity = {
        ...mockEvent,
        participant_count: 5,
        capacity: 10,
        is_full: false,
        is_participating: false,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventWithCapacity,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const participantElements = screen.getAllByText((content, element) => {
        const text = element?.textContent ?? "";
        return (
          text.includes("Participants:") &&
          text.includes("5") &&
          text.includes("10")
        );
      });
      expect(participantElements.length).toBeGreaterThan(0);
    });

    it("should display 'Unlimited' when capacity is null", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventUnlimited = {
        ...mockEvent,
        participant_count: 15,
        capacity: null,
        is_full: false,
        is_participating: false,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventUnlimited,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(
        screen.getAllByText(
          (_, element) =>
            element?.textContent === "Participants: 15 (Unlimited)",
        ).length,
      ).toBeGreaterThan(0);
    });

    it("should display 'Unlimited' when capacity is 0", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventZeroCapacity = {
        ...mockEvent,
        participant_count: 20,
        capacity: 0,
        is_full: false,
        is_participating: false,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventZeroCapacity,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(
        screen.getAllByText(
          (_, element) =>
            element?.textContent === "Participants: 20 (Unlimited)",
        ).length,
      ).toBeGreaterThan(0);
    });

    it("should display 'Event Full' badge when event is full", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const fullEvent = {
        ...mockEvent,
        participant_count: 10,
        capacity: 10,
        is_full: true,
        is_participating: false,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => fullEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const badges = screen.getAllByText("Event Full");
      // Find the <span> badge (not the button)
      const badge = badges.find(
        (el) =>
          el.tagName.toLowerCase() === "span" &&
          el.className.includes("bg-red-500"),
      );
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-red-500");
    });

    it("should show 'Participate' button when user is not participating", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventNotParticipating = {
        ...mockEvent,
        participant_count: 5,
        capacity: 10,
        is_full: false,
        is_participating: false,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventNotParticipating,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const participateButton = screen.getByRole("button", {
        name: "Participate",
      });
      expect(participateButton).toBeInTheDocument();
      expect(participateButton).not.toBeDisabled();
    });

    it("should show 'Cancel Participation' button when user is already participating", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventParticipating = {
        ...mockEvent,
        participant_count: 5,
        capacity: 10,
        is_full: false,
        is_participating: true,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventParticipating,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const cancelButton = screen.getByRole("button", {
        name: "Cancel Participation",
      });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveClass("bg-red-600");
    });

    it("should disable participate button when event is full and user is not participating", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const fullEvent = {
        ...mockEvent,
        participant_count: 10,
        capacity: 10,
        is_full: true,
        is_participating: false,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => fullEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const participateButton = screen.getByRole("button", {
        name: "Event Full",
      });
      expect(participateButton).toBeDisabled();
      expect(participateButton).toHaveClass("bg-gray-400");
    });

    it("should allow canceling participation even when event is full", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const fullEventParticipating = {
        ...mockEvent,
        participant_count: 10,
        capacity: 10,
        is_full: true,
        is_participating: true,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => fullEventParticipating,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const cancelButton = screen.getByRole("button", {
        name: "Cancel Participation",
      });
      expect(cancelButton).not.toBeDisabled();
    });

    it("should handle participation API error gracefully", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventNotParticipating = {
        ...mockEvent,
        participant_count: 5,
        capacity: 10,
        is_full: false,
        is_participating: false,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch, then participation toggle (fails)
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventNotParticipating,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response)
        .mockRejectedValueOnce(new Error("API Error"));

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const participateButton = screen.getByRole("button", {
        name: "Participate",
      });
      fireEvent.click(participateButton);

      await waitFor(() => {
        // First check that the button changed (confirms state update happened)
        expect(
          screen.getByRole("button", { name: "Participate" }),
        ).toBeInTheDocument();
      });

      // Then check participant count
      await waitFor(
        () => {
          const participantText = screen.getByText(/Participants:/i);
          expect(participantText.textContent).toMatch(/5.*10|10.*5/);
        },
        { timeout: 3000 },
      );
    });

    it("should handle 401/403 response and fallback to public fetch", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch to return 401, then public fetch succeeds
      // The user fetch useEffect runs when isAuthenticated is true, but after 401,
      // isAuthenticated becomes false, so user fetch won't run
      // However, the user fetch might run before the event fetch completes, so we need to mock it
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response); // Mock user fetch to also return 401 (will be ignored after token removal)

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await waitFor(
        () => {
          expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it("should handle fetchWithAuth error and fallback to public fetch", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch to throw error, then public fetch succeeds
      // The user fetch useEffect might run before isAuthenticated is set to false,
      // so we need to mock it as well
      mockFetchWithAuth
        .mockRejectedValueOnce(new Error("Network error")) // Event fetch fails
        .mockRejectedValueOnce(new Error("Network error")); // User fetch (if it runs)

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await waitFor(
        () => {
          expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it("should handle invalid auth tokens gracefully", async () => {
      // Mock localStorage.getItem to return invalid JSON
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens") return "invalid json";
        return null;
      });

      // Invalid JSON means isAuthenticated will be false, so use public fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await waitFor(
        () => {
          expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it("should handle toggleParticipation when res.ok is false", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventParticipating = {
        ...mockEvent,
        is_participating: true,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch, then participation toggle (fails)
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventParticipating,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: "Bad request" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const cancelButton = screen.getByRole("button", {
        name: "Cancel Participation",
      });
      fireEvent.click(cancelButton);

      // Should handle error gracefully (event state should not change)
      await waitFor(() => {
        expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
      });
    });

    it("should handle user fetch error gracefully", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch first, then user fetch (fails with 500)
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await waitFor(
        () => {
          // Should still render the event even if user fetch fails
          expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it("should handle user fetch 401/403 and clear tokens", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      const removeItemSpy = jest.spyOn(Storage.prototype, "removeItem");

      // Mock fetchWithAuth for event fetch first, then user fetch (401)
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      await waitFor(() => {
        expect(removeItemSpy).toHaveBeenCalledWith("auth_tokens");
      });
    });

    it("should handle user fetch catch error", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      // Mock fetchWithAuth for event fetch first, then user fetch (throws error)
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        } as Response)
        .mockRejectedValueOnce(new Error("Network error"));

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      // Should still render the event
      expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
    });

    it("should handle toggleParticipation catch error", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      const eventParticipating = {
        ...mockEvent,
        is_participating: true,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch, then participation toggle
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventParticipating,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        } as Response)
        .mockRejectedValueOnce(new Error("Network error"));

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const cancelButton = screen.getByRole("button", {
        name: "Cancel Participation",
      });
      fireEvent.click(cancelButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
      });
    });

    it("should handle handleCancel catch error", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      window.alert = jest.fn();

      // Mock cancelEventRequest to throw an error
      mockCancelEventRequest.mockImplementation(() => {
        throw new Error("Network error");
      });

      const eventOrganizer = {
        ...mockEvent,
        organizer: 2,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch, then cancel event
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => eventOrganizer,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ORGANIZER" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const cancelButton = screen.getByRole("button", { name: "Cancel Event" });

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      fireEvent.click(cancelButton);

      // Wait for the error to occur (the catch block will call alert)
      await waitFor(
        () => {
          expect(window.alert).toHaveBeenCalledWith("Could not cancel event");
        },
        { timeout: 3000 },
      );
    });

    it("should handle handleUncancel catch error", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      window.alert = jest.fn();
      window.confirm = jest.fn(() => true);

      // Mock uncancelEventRequest to throw an error
      mockUncancelEventRequest.mockImplementation(() => {
        throw new Error("Network error");
      });

      const canceledEvent = {
        ...mockEvent,
        status: "Canceled",
        organizer: 2,
      };

      // Mock fetchWithAuth for event fetch first, then user fetch, then uncancel event
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => canceledEvent,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ORGANIZER" }),
        } as Response);

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const reactivateButton = screen.getByRole("button", {
        name: "Reactivate Event",
      });
      fireEvent.click(reactivateButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          "Could not reactivate the event",
        );
      });
    });
  });
});

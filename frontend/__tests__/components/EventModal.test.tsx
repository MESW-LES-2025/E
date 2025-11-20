import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventModal from "../../components/EventModal";

describe("EventModal", () => {
  const mockOnClose = jest.fn();
  const mockEvent = {
    id: 1,
    name: "Test Event",
    date: "2024-12-25T10:00:00Z",
    location: "Test Location",
    description: "Test Description",
    organizer: 1,
    organizer_name: "Test Organizer",
    status: "Active",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000/api";
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
      expect(screen.getByText(mockEvent.organizer_name)).toBeInTheDocument();
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
      expect(screen.queryByText("Organizer")).not.toBeInTheDocument(); // organizer_name is null
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

    it("should place organizer before description", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });
      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);
      const organizer = screen.getByText(mockEvent.organizer_name);
      const description = screen.getByText("Test Description");
      expect(organizer.compareDocumentPosition(description)).toBe(4); // Node.DOCUMENT_POSITION_FOLLOWING
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
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          // event fetch
          ok: true,
          json: async () => mockEvent, // organizer is 1
        })
        .mockResolvedValueOnce({
          // user fetch
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }), // user is organizer 1
        });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(
        screen.getByRole("button", { name: /Participants/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Participant list goes here..."),
      ).not.toBeInTheDocument();
    });

    it("should NOT show the Participants section for a non-organizer authenticated user", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }), // User is an attendee
        });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(
        screen.queryByRole("button", { name: /Participants/i }),
      ).not.toBeInTheDocument();
    });

    it("should toggle Participants section visibility on click when user is the event organizer", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          // event fetch
          ok: true,
          json: async () => mockEvent, // organizer is 1
        })
        .mockResolvedValueOnce({
          // user fetch
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }), // user is organizer 1
        });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const participantsButton = screen.getByRole("button", {
        name: /Participants/i,
      });

      expect(participantsButton).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(participantsButton);
      expect(
        screen.getByText("Participant list goes here..."),
      ).toBeInTheDocument();
      expect(participantsButton).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(participantsButton);
      expect(
        screen.queryByText("Participant list goes here..."),
      ).not.toBeInTheDocument();
      expect(participantsButton).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Button Links", () => {
    it("should show only the Login button when user is not authenticated", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      const loginButton = screen.getByText("Login");
      expect(loginButton).toBeInTheDocument();
      expect(loginButton.closest("a")).toHaveAttribute(
        "href",
        "/profile/login",
      );
      expect(screen.queryByText("Participate")).not.toBeInTheDocument();
      expect(screen.queryByText("Interested")).not.toBeInTheDocument();
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel Event")).not.toBeInTheDocument();
    });

    it("should NOT show Edit and Cancel buttons if user is an ORGANIZER but not the event's organizer", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          // event fetch
          ok: true,
          json: async () => mockEvent,
        })
        .mockResolvedValueOnce({
          // user fetch
          ok: true,
          json: async () => ({ id: 99, role: "ORGANIZER" }), // An organizer, but not the event's organizer
        });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(screen.queryByText("Login")).not.toBeInTheDocument();
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Cancel Event")).not.toBeInTheDocument();
    });

    it('should show Participate and Interested buttons for an "ATTENDEE" user', async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          // event fetch
          ok: true,
          json: async () => mockEvent,
        })
        .mockResolvedValueOnce({
          // user fetch
          ok: true,
          json: async () => ({ id: 2, role: "ATTENDEE" }),
        });

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

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 99, role: "ORGANIZER" }), // Or any other type
        });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(screen.queryByText("Participate")).not.toBeInTheDocument();
      expect(screen.queryByText("Interested")).not.toBeInTheDocument();
    });

    it("should show Edit and Cancel buttons if user is the event organizer", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
        if (key === "auth_tokens")
          return JSON.stringify({ access: "fake-token" });
        return null;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent, // event.organizer is 1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, role: "ORGANIZER" }), // User is organizer with ID 1
        });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText(mockEvent.name);

      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Cancel Event")).toBeInTheDocument();
      // Check that the Edit button links to the correct page
      expect(screen.getByText("Edit").closest("a")).toHaveAttribute(
        "href",
        `/events/edit/${mockEvent.id}`,
      );
    });
  });
});

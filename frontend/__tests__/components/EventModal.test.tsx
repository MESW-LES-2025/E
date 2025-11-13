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
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
      await screen.findByText("Event details");
      expect(screen.getByText("Event details")).toBeInTheDocument();
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
      await screen.findByText("Event details");
      const closeButton = screen.getByLabelText("Close modal");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when Close button at bottom is clicked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText("Event details");
      const closeButtons = screen.getAllByText("Close");
      fireEvent.click(closeButtons[closeButtons.length - 1]);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when backdrop is clicked", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText("Event details");
      const backdrop = screen.getByRole("dialog");
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

      const modalContent =
        screen.getByText("Event details").parentElement?.parentElement;
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
      await screen.findByText("Event details");
      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when other keys are pressed", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);
      await screen.findByText("Event details");
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
        const dateElement = screen.getByText(/Date:/);
        expect(dateElement).toBeInTheDocument();
      });
    });

    it("should handle missing optional fields", async () => {
      const eventWithoutOptionals = {
        id: 1,
        name: "Minimal Event",
        date: "",
        location: "",
        description: "",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => eventWithoutOptionals,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Minimal Event")).toBeInTheDocument();
      });

      expect(screen.queryByText("Date:")).not.toBeInTheDocument();
      expect(screen.queryByText("Location:")).not.toBeInTheDocument();
      expect(screen.queryByText("Description:")).not.toBeInTheDocument();
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
      await screen.findByText("Event details");
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

  describe("Button Links", () => {
    it("should render all action buttons", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      });

      render(<EventModal id="1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument();
      });

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Participate")).toBeInTheDocument();
      expect(screen.getByText("Interested")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });
});

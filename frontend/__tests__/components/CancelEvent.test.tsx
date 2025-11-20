/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import EventModal from "@/components/EventModal";
import { cancelEventRequest, uncancelEventRequest } from "@/lib/events";

// Mock the API calls
jest.mock("@/../../lib/events", () => ({
  cancelEventRequest: jest.fn(),
  uncancelEventRequest: jest.fn(),
}));

const mockEvent = {
  id: 1,
  name: "Test Event",
  date: "2030-01-01T12:00:00Z",
  location: "Test Location",
  description: "Test Description",
  organizer: 10,
  organizer_name: "Organizer User",
  status: "Active",
};

const mockUser = {
  id: 10,
  username: "organizer",
  email: "organizer@test.com",
  first_name: "Org",
  last_name: "User",
  role: "ORGANIZER",
};

describe("EventModal Cancel/Reactivate Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage for authentication
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => "fake_token"),
      },
      writable: true,
    });

    // Mock window.confirm to always return true
    jest.spyOn(window, "confirm").mockImplementation(() => true);

    // Mock fetch to return event and user
    global.fetch = jest.fn((url) =>
      Promise.resolve({
        ok: true,
        json: () => {
          if (url.toString().includes("/auth/users/me/"))
            return Promise.resolve(mockUser);
          return Promise.resolve(mockEvent);
        },
      } as Response),
    );
  });

  const onClose = jest.fn();

  test("shows Cancel Event button for active event", async () => {
    render(<EventModal id="1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /Cancel Event/i });
    expect(cancelBtn).toBeInTheDocument();
  });

  test("cancels event and shows Reactivate Event button", async () => {
    (cancelEventRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockEvent, status: "Canceled" }),
    });

    render(<EventModal id="1" onClose={onClose} />);

    // Wait for initial load
    const cancelBtn = await screen.findByRole("button", {
      name: /Cancel Event/i,
    });
    await userEvent.click(cancelBtn);

    // After cancel, Reactivate button should appear
    const reactivateBtn = await screen.findByRole("button", {
      name: /Reactivate Event/i,
    });
    expect(reactivateBtn).toBeInTheDocument();
    expect(screen.getByText("Canceled")).toBeInTheDocument();
  });

  test("reactivates event and shows Cancel Event button", async () => {
    const canceledEvent = { ...mockEvent, status: "Canceled" };

    // Mock Cancel first
    (cancelEventRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => canceledEvent,
    });

    // Mock Uncancel
    (uncancelEventRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockEvent, status: "Active" }),
    });

    render(<EventModal id="1" onClose={onClose} />);

    // Cancel event first
    const cancelBtn = await screen.findByRole("button", {
      name: /Cancel Event/i,
    });
    await userEvent.click(cancelBtn);

    const reactivateBtn = await screen.findByRole("button", {
      name: /Reactivate Event/i,
    });
    await userEvent.click(reactivateBtn);

    // After reactivation
    const cancelBtnAfter = await screen.findByRole("button", {
      name: /Cancel Event/i,
    });
    expect(cancelBtnAfter).toBeInTheDocument();
    expect(screen.queryByText(/Canceled/i)).not.toBeInTheDocument();
  });
});

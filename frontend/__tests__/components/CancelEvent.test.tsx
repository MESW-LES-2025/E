/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Caminhos relativos (estamos em frontend/__tests__/components)
import EventModal from "../../components/EventModal";
import { cancelEventRequest, uncancelEventRequest } from "../../lib/events";

// Relative path
jest.mock("../../lib/events", () => ({
  cancelEventRequest: jest.fn(),
  uncancelEventRequest: jest.fn(),
}));

// Mock fetchWithAuth (relative path)
jest.mock("../../lib/auth", () => ({
  fetchWithAuth: (url: string, options?: RequestInit) =>
    global.fetch(url, options),
}));

const mockEventActive = {
  id: 1,
  name: "Test Event",
  date: "2030-01-01T12:00:00Z",
  location: "Test Location",
  description: "Test Description",
  organizer: 10,
  organizer_name: "Organizer User",
  status: "Active",
  participant_count: 0,
  is_participating: false,
  capacity: null,
  is_full: false,
};

const mockUserOrganizer = {
  id: 10,
  username: "organizer",
  email: "organizer@test.com",
  first_name: "Org",
  last_name: "User",
  role: "ORGANIZER",
};

describe("EventModal Cancel/Reactivate Functionality", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => JSON.stringify({ access: "fake_token" })),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    jest.spyOn(window, "confirm").mockImplementation(() => true);

    global.fetch = jest.fn((url) =>
      Promise.resolve({
        ok: true,
        json: () => {
          const s = url.toString();
          if (s.includes("/auth/users/me/"))
            return Promise.resolve(mockUserOrganizer);
          if (s.includes("/events/1/")) return Promise.resolve(mockEventActive);
          return Promise.resolve({});
        },
      } as Response),
    );
  });

  test("shows Cancel Event button for active event", async () => {
    render(<EventModal id="1" onClose={onClose} />);

    const cancelBtn = await screen.findByRole("button", {
      name: /Cancel Event/i,
    });
    expect(cancelBtn).toBeInTheDocument();
  });

  test("cancels event and shows Reactivate Event button", async () => {
    (cancelEventRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockEventActive, status: "Canceled" }),
    });

    render(<EventModal id="1" onClose={onClose} />);

    const cancelBtn = await screen.findByRole("button", {
      name: /Cancel Event/i,
    });
    await userEvent.click(cancelBtn);

    const reactivateBtn = await screen.findByRole("button", {
      name: /Reactivate Event/i,
    });
    expect(reactivateBtn).toBeInTheDocument();
    expect(screen.getByText("Canceled")).toBeInTheDocument();
  });

  test("Reactivate event and shows Cancel Event agains", async () => {
    (cancelEventRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockEventActive, status: "Canceled" }),
    });
    (uncancelEventRequest as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockEventActive, status: "Active" }),
    });

    render(<EventModal id="1" onClose={onClose} />);

    const cancelBtn = await screen.findByRole("button", {
      name: /Cancel Event/i,
    });
    await userEvent.click(cancelBtn);

    const reactivateBtn = await screen.findByRole("button", {
      name: /Reactivate Event/i,
    });
    await userEvent.click(reactivateBtn);

    const cancelBtnAfter = await screen.findByRole("button", {
      name: /Cancel Event/i,
    });
    expect(cancelBtnAfter).toBeInTheDocument();
    expect(screen.queryByText(/Canceled/i)).not.toBeInTheDocument();
  });
});

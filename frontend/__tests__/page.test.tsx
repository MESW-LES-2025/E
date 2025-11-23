import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "../app/page";
import { ErasmusEvent } from "@/lib/types";

describe("Home Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows 'No upcoming events' when no events exist", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    ) as jest.Mock;

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("No events available")).toBeInTheDocument();
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
        description: "A test event description",
        organizerId: "org1",
        registeredUsersIds: [],
        interestedUsersIds: [],
      },
      {
        id: 2,
        name: "Another Event",
        date: now.toISOString(),
        location: "Main Hall",
        description: "Another event description",
        organizerId: "org2",
        registeredUsersIds: [],
        interestedUsersIds: [],
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
  });

  it("shows error message when fetch fails", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
      }),
    ) as jest.Mock;

    render(<Home />);
    await waitFor(() => {
      expect(
        screen.getByText("Error: Could not load events"),
      ).toBeInTheDocument();
    });
  });
});

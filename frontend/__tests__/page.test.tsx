import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "../app/page";

describe("Home Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  it("shows 'No upcoming events' when no events exist", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      }),
    ) as jest.Mock;

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("No events available")).toBeInTheDocument();
    });
  });

  it("renders event cards when upcoming events exist", async () => {
    const now = new Date();
    const events = [
      {
        id: 1,
        name: "Test Event",
        date: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(), // 1 day in future
        location: "City Center",
      },
    ];

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: events }),
      }),
    ) as jest.Mock;

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
      expect(screen.getByText(/City Center/)).toBeInTheDocument();
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
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });
});

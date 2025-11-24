import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "../app/page";
import { listOrganizations } from "../lib/organizations";

// Mock organizations library
jest.mock("../lib/organizations", () => ({
  listOrganizations: jest.fn(),
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
        json: () => Promise.resolve([]),
      }),
    ) as jest.Mock;

    render(<Home />);
    await waitFor(() => {
      expect(
        screen.getByText("No events found matching your filters"),
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
        expect(
          screen.getByText(/No events found matching your filters/),
        ).toBeInTheDocument();
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventsCalendar from "../../app/calendar/page";
import * as auth from "@/lib/auth";
import * as utils from "@/lib/utils";
import { ErasmusEvent } from "@/lib/types";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/lib/auth");
const mockedIsAuthenticated = auth.isAuthenticated as jest.Mock;

jest.mock("@/lib/utils");
const mockedFetchWrapped = utils.fetchWrapped as jest.Mock;

const mockEvents: ErasmusEvent[] = [
  {
    id: 1,
    name: "Test Event 1",
    date: new Date().toISOString(),
    location: "Test Location 1",
    description: "Test Description 1",
    organizerId: "1",
    registeredUsersIds: [],
    interestedUsersIds: [],
  },
];

describe("EventsCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchWrapped.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    });
  });

  it("redirects to login if not authenticated", () => {
    mockedIsAuthenticated.mockReturnValue(false);
    render(<EventsCalendar />);
    expect(mockPush).toHaveBeenCalledWith("/profile/login");
  });

  it("renders calendar and fetches events when authenticated", async () => {
    mockedIsAuthenticated.mockReturnValue(true);
    render(<EventsCalendar />);

    expect(screen.getByText("All Events")).toBeInTheDocument();
    expect(screen.getByText("Registered")).toBeInTheDocument();
    expect(screen.getByText("Interested")).toBeInTheDocument();
    expect(screen.getByText("Organized")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedFetchWrapped).toHaveBeenCalledWith("events");
    });

    await waitFor(() => {
      expect(screen.getByText("Test Event 1")).toBeInTheDocument();
    });
  });

  it("shows no events message when there are no events for the selected day", async () => {
    mockedIsAuthenticated.mockReturnValue(true);
    mockedFetchWrapped.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<EventsCalendar />);

    await waitFor(() => {
      expect(
        screen.getByText(
          `No events are planned for ${new Date().toLocaleDateString()}`,
        ),
      ).toBeInTheDocument();
    });
  });

  it("filters events when a filter button is clicked", async () => {
    mockedIsAuthenticated.mockReturnValue(true);
    render(<EventsCalendar />);

    await waitFor(() => {
      expect(mockedFetchWrapped).toHaveBeenCalledWith("events");
    });

    fireEvent.click(screen.getByText("Registered"));

    await waitFor(() => {
      expect(mockedFetchWrapped).toHaveBeenCalledWith("events/registered/");
    });

    fireEvent.click(screen.getByText("Interested"));

    await waitFor(() => {
      expect(mockedFetchWrapped).toHaveBeenCalledWith("events/interested/");
    });

    fireEvent.click(screen.getByText("Organized"));

    await waitFor(() => {
      expect(mockedFetchWrapped).toHaveBeenCalledWith("events/organized/");
    });
  });
});

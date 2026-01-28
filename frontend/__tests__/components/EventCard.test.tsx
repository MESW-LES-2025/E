import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import EventCard from "../../components/EventCard";
import { ErasmusEvent } from "@/lib/types";

describe("EventCard", () => {
  const mockEvent: ErasmusEvent = {
    id: 1,
    name: "Test Event",
    date: new Date().toISOString(),
    location: "Test Location",
    description: "Test Description",
    organizerId: "1",
    registeredUsersIds: [],
    interestedUsersIds: [],
  };

  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render event card with basic information", () => {
    render(<EventCard event={mockEvent} onViewDetails={mockOnViewDetails} />);

    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText("Test Location")).toBeInTheDocument();
  });

  it("should call onViewDetails when View Details button is clicked", () => {
    render(<EventCard event={mockEvent} onViewDetails={mockOnViewDetails} />);

    const viewDetailsButton = screen.getByText("View Details");
    fireEvent.click(viewDetailsButton);

    expect(mockOnViewDetails).toHaveBeenCalledWith("1");
  });

  it("should display participant count when available", () => {
    const eventWithParticipants: ErasmusEvent = {
      ...mockEvent,
      participant_count: 10,
    };

    render(
      <EventCard
        event={eventWithParticipants}
        onViewDetails={mockOnViewDetails}
      />,
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("participants")).toBeInTheDocument();
  });

  it("should display interest count when greater than 0", () => {
    const eventWithInterest: ErasmusEvent = {
      ...mockEvent,
      interest_count: 5,
    };

    render(
      <EventCard event={eventWithInterest} onViewDetails={mockOnViewDetails} />,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("interested")).toBeInTheDocument();
  });

  it("should NOT display interest count when it is 0", () => {
    const eventWithZeroInterest: ErasmusEvent = {
      ...mockEvent,
      interest_count: 0,
    };

    render(
      <EventCard
        event={eventWithZeroInterest}
        onViewDetails={mockOnViewDetails}
      />,
    );

    // Interest count should not be displayed
    const interestTexts = screen.queryAllByText("interested");
    expect(interestTexts.length).toBe(0);
  });

  it("should NOT display interest count when it is undefined", () => {
    render(<EventCard event={mockEvent} onViewDetails={mockOnViewDetails} />);

    // Interest count should not be displayed
    const interestTexts = screen.queryAllByText("interested");
    expect(interestTexts.length).toBe(0);
  });
});

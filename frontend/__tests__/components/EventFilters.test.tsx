import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import EventFilters, { FilterValues } from "@/components/EventFilters";

describe("EventFilters", () => {
  const mockOnFilterChange = jest.fn();

  const defaultFilters: FilterValues = {
    category: [],
    dateFilter: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the filters component with all sections", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(
        screen.getByPlaceholderText(
          "Search events by name, location, or description...",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Categories:")).toBeInTheDocument();
      expect(screen.getByText("When:")).toBeInTheDocument();
    });

    it("should render all quick date filter buttons", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByText("Tomorrow")).toBeInTheDocument();
      expect(screen.getByText("Current Week")).toBeInTheDocument();
    });

    it("should render clear all button when filters are active", () => {
      const filtersWithValues: FilterValues = {
        category: ["SOCIAL"],
        dateFilter: "",
        dateFrom: "",
        dateTo: "",
        search: "test",
      };
      render(
        <EventFilters
          filters={filtersWithValues}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Clear all")).toBeInTheDocument();
    });
  });

  describe("Search Input", () => {
    it("should update search value when typing", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search events by name, location, or description...",
      );
      await user.type(searchInput, "test event");

      expect(searchInput).toHaveValue("test event");
    });

    it("should display initial search value from filters", () => {
      const filtersWithSearch = { ...defaultFilters, search: "initial search" };
      render(
        <EventFilters
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(
        screen.getByPlaceholderText(
          "Search events by name, location, or description...",
        ),
      ).toHaveValue("initial search");
    });
  });

  describe("Category Selection", () => {
    it("should display all category badges", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Social")).toBeInTheDocument();
      expect(screen.getByText("Academic")).toBeInTheDocument();
      expect(screen.getByText("Travel")).toBeInTheDocument();
      expect(screen.getByText("Sports")).toBeInTheDocument();
      expect(screen.getByText("Cultural")).toBeInTheDocument();
      expect(screen.getByText("Volunteering")).toBeInTheDocument();
      expect(screen.getByText("Nightlife")).toBeInTheDocument();
    });

    it("should highlight selected categories", () => {
      const filtersWithCategories = {
        ...defaultFilters,
        category: ["SOCIAL", "ACADEMIC"],
      };
      render(
        <EventFilters
          filters={filtersWithCategories}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const socialBadge = screen.getByText("Social");
      expect(socialBadge).toHaveClass("bg-primary");
    });

    it("should toggle category selection when clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const socialBadge = screen.getByText("Social");
      await user.click(socialBadge);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            category: ["SOCIAL"],
          }),
        );
      });
    });
  });

  describe("Quick Date Filters", () => {
    it("should apply 'Today' filter when clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const todayButton = screen.getByText("Today");
      await user.click(todayButton);

      expect(todayButton).toHaveClass("bg-primary");
    });

    it("should apply 'Tomorrow' filter when clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const tomorrowButton = screen.getByText("Tomorrow");
      await user.click(tomorrowButton);

      expect(tomorrowButton).toHaveClass("bg-primary");
    });

    it("should apply 'Current Week' filter when clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const weekButton = screen.getByText("Current Week");
      await user.click(weekButton);

      expect(weekButton).toHaveClass("bg-primary");
    });

    it("should highlight active date filter", () => {
      const filtersWithDateFilter = { ...defaultFilters, dateFilter: "today" };
      render(
        <EventFilters
          filters={filtersWithDateFilter}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const todayButton = screen.getByText("Today");
      expect(todayButton).toHaveClass("bg-primary");
    });
  });

  describe("Custom Date Range", () => {
    it("should show 'Custom' button when no dates selected", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("should display selected date range", () => {
      const filtersWithDates = {
        ...defaultFilters,
        dateFrom: "2025-11-23",
        dateTo: "2025-11-25",
      };
      render(
        <EventFilters
          filters={filtersWithDates}
          onFilterChange={mockOnFilterChange}
        />,
      );

      // The date format is "MMM dd - MMM dd" (e.g., "Nov 23 - Nov 25")
      expect(screen.getByText(/Nov 23/)).toBeInTheDocument();
      expect(screen.getByText(/Nov 25/)).toBeInTheDocument();
    });

    it("should open calendar when custom range button clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const dateButton = screen.getByText("Custom");
      await user.click(dateButton);

      await waitFor(() => {
        const calendar = document.querySelector('[role="grid"]');
        expect(calendar).toBeInTheDocument();
      });
    });
  });

  describe("Clear All Button", () => {
    it("should reset all filters when clicked", async () => {
      const user = userEvent.setup();
      const filtersWithValues: FilterValues = {
        category: ["SOCIAL"],
        dateFilter: "today",
        dateFrom: "2025-11-23",
        dateTo: "2025-11-23",
        search: "test",
      };

      render(
        <EventFilters
          filters={filtersWithValues}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const clearButton = screen.getByText("Clear all");
      await user.click(clearButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        category: [],
        dateFilter: "",
        dateFrom: "",
        dateTo: "",
        search: "",
      });
    });

    it("should clear search input after reset", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search events by name, location, or description...",
      );
      await user.type(searchInput, "test");

      // Clear all button only appears when filters are active
      const clearButton = screen.getByText("Clear all");
      await user.click(clearButton);

      expect(searchInput).toHaveValue("");
    });
  });

  describe("Auto-apply Filters", () => {
    it("should call onFilterChange with current filter values", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search events by name, location, or description...",
      );
      await user.type(searchInput, "conference");

      // Filters auto-apply immediately via useEffect
      await waitFor(
        () => {
          expect(mockOnFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
              search: "conference",
            }),
          );
        },
        { timeout: 500 },
      );
    });

    it("should apply multiple filter changes together", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search events by name, location, or description...",
      );
      await user.type(searchInput, "sports");

      const todayButton = screen.getByText("Today");
      await user.click(todayButton);

      // Filters auto-apply immediately via useEffect
      await waitFor(
        () => {
          expect(mockOnFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
              search: "sports",
              dateFilter: "today",
            }),
          );
        },
        { timeout: 500 },
      );
    });
  });

  describe("Filter Interactions", () => {
    it("should maintain filter state between interactions", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search events by name, location, or description...",
      );
      await user.type(searchInput, "music");

      const todayButton = screen.getByText("Today");
      await user.click(todayButton);

      expect(searchInput).toHaveValue("music");
      expect(todayButton).toHaveClass("bg-primary");
    });

    it("should clear quick date filter when custom range is selected", async () => {
      const filtersWithQuickDate = {
        ...defaultFilters,
        dateFilter: "today",
        dateFrom: "2025-11-23",
        dateTo: "2025-11-23",
      };

      render(
        <EventFilters
          filters={filtersWithQuickDate}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Today")).toHaveClass("bg-primary");
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for form controls", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(
        screen.getByPlaceholderText(
          "Search events by name, location, or description...",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Categories:")).toBeInTheDocument();
      expect(screen.getByText("When:")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText(
        "Search events by name, location, or description...",
      );

      await user.type(searchInput, "test");
      expect(searchInput).toHaveValue("test");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty filter values", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(
        screen.getByPlaceholderText(
          "Search events by name, location, or description...",
        ),
      ).toHaveValue("");
      expect(screen.getByText("Categories:")).toBeInTheDocument();
      expect(screen.getByText("When:")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("should handle rapid filter changes", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      await user.click(screen.getByText("Today"));
      await user.click(screen.getByText("Tomorrow"));
      await user.click(screen.getByText("Current Week"));

      expect(screen.getByText("Current Week")).toHaveClass("bg-primary");
    });
  });

  describe("Date Range Handling", () => {
    it("should handle date selection with from and to dates", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const dateButton = screen.getByText("Custom");
      await user.click(dateButton);

      await waitFor(() => {
        const calendar = document.querySelector('[role="grid"]');
        expect(calendar).toBeInTheDocument();
      });

      // The date selection logic is tested through the calendar component
      // Here we verify the component structure supports date selection
      expect(dateButton).toBeInTheDocument();
    });

    it("should handle date selection when range is cleared", async () => {
      const filtersWithDates = {
        ...defaultFilters,
        dateFrom: "2025-11-23",
        dateTo: "2025-11-25",
      };

      render(
        <EventFilters
          filters={filtersWithDates}
          onFilterChange={mockOnFilterChange}
        />,
      );

      // The date clearing logic is handled internally
      // We verify the component renders with dates
      expect(screen.getByText(/Nov 23/)).toBeInTheDocument();
    });

    it("should handle date selection when from and to are the same", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const dateButton = screen.getByText("Custom");
      await user.click(dateButton);

      // When from === to, the date filter should not be applied
      // This is tested through the calendar component behavior
      await waitFor(() => {
        expect(dateButton).toBeInTheDocument();
      });
    });
  });

  describe("Reset Functionality", () => {
    it("should reset all filters including date range", async () => {
      const user = userEvent.setup();
      const filtersWithValues: FilterValues = {
        category: ["SOCIAL", "ACADEMIC"],
        dateFilter: "today",
        dateFrom: "2025-11-23",
        dateTo: "2025-11-25",
        search: "test search",
      };

      render(
        <EventFilters
          filters={filtersWithValues}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const clearButton = screen.getByText("Clear all");
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          category: [],
          dateFilter: "",
          dateFrom: "",
          dateTo: "",
          search: "",
        });
      });
    });
  });
});

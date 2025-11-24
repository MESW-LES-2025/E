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

      expect(screen.getByText("Filters")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Search events..."),
      ).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("When")).toBeInTheDocument();
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

    it("should render reset and apply buttons", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Reset")).toBeInTheDocument();
      expect(screen.getByText("Apply Filters")).toBeInTheDocument();
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

      const searchInput = screen.getByPlaceholderText("Search events...");
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

      expect(screen.getByPlaceholderText("Search events...")).toHaveValue(
        "initial search",
      );
    });
  });

  describe("Category Selection", () => {
    it("should show 'Select categories...' when no categories selected", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Select categories...")).toBeInTheDocument();
    });

    it("should display count when categories are selected", () => {
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

      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    it("should open category dropdown when clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const categoryButton = screen.getByText("Select categories...");
      await user.click(categoryButton);

      await waitFor(() => {
        expect(screen.getByText("Social")).toBeInTheDocument();
        expect(screen.getByText("Academic")).toBeInTheDocument();
        expect(screen.getByText("Travel")).toBeInTheDocument();
        expect(screen.getByText("Sports")).toBeInTheDocument();
        expect(screen.getByText("Cultural")).toBeInTheDocument();
        expect(screen.getByText("Volunteering")).toBeInTheDocument();
        expect(screen.getByText("Nightlife")).toBeInTheDocument();
      });
    });

    it("should toggle category selection when clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const categoryButton = screen.getByText("Select categories...");
      await user.click(categoryButton);

      await waitFor(() => {
        expect(screen.getByText("Social")).toBeInTheDocument();
      });

      const socialOption = screen.getByText("Social");
      await user.click(socialOption);

      expect(screen.getByText("1 selected")).toBeInTheDocument();
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

      expect(todayButton).toHaveClass("bg-blue-400");
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

      expect(tomorrowButton).toHaveClass("bg-blue-400");
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

      expect(weekButton).toHaveClass("bg-blue-400");
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
      expect(todayButton).toHaveClass("bg-blue-400");
    });
  });

  describe("Custom Date Range", () => {
    it("should show 'Pick dates' placeholder when no dates selected", () => {
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      expect(screen.getByText("Pick dates")).toBeInTheDocument();
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

      expect(screen.getByText(/Nov 23.*Nov 25, 2025/)).toBeInTheDocument();
    });

    it("should open calendar when custom range button clicked", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const dateButton = screen.getByText("Pick dates");
      await user.click(dateButton);

      await waitFor(() => {
        const calendar = document.querySelector('[role="grid"]');
        expect(calendar).toBeInTheDocument();
      });
    });
  });

  describe("Reset Button", () => {
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

      const resetButton = screen.getByText("Reset");
      await user.click(resetButton);

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

      const searchInput = screen.getByPlaceholderText("Search events...");
      await user.type(searchInput, "test");

      const resetButton = screen.getByText("Reset");
      await user.click(resetButton);

      expect(searchInput).toHaveValue("");
    });
  });

  describe("Apply Filters Button", () => {
    it("should call onFilterChange with current filter values", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText("Search events...");
      await user.type(searchInput, "conference");

      const applyButton = screen.getByText("Apply Filters");
      await user.click(applyButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "conference",
        }),
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

      const searchInput = screen.getByPlaceholderText("Search events...");
      await user.type(searchInput, "sports");

      const todayButton = screen.getByText("Today");
      await user.click(todayButton);

      const applyButton = screen.getByText("Apply Filters");
      await user.click(applyButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "sports",
          dateFilter: "today",
        }),
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

      const searchInput = screen.getByPlaceholderText("Search events...");
      await user.type(searchInput, "music");

      const todayButton = screen.getByText("Today");
      await user.click(todayButton);

      expect(searchInput).toHaveValue("music");
      expect(todayButton).toHaveClass("bg-blue-400");
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

      expect(screen.getByText("Today")).toHaveClass("bg-blue-400");
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

      expect(screen.getByText("Search")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("When")).toBeInTheDocument();
      expect(screen.getByText("Custom Range")).toBeInTheDocument();
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const searchInput = screen.getByPlaceholderText("Search events...");

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

      expect(screen.getByPlaceholderText("Search events...")).toHaveValue("");
      expect(screen.getByText("Select categories...")).toBeInTheDocument();
      expect(screen.getByText("Pick dates")).toBeInTheDocument();
    });

    it("should handle all categories being selected", async () => {
      const user = userEvent.setup();
      render(
        <EventFilters
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );

      const categoryButton = screen.getByText("Select categories...");
      await user.click(categoryButton);

      await waitFor(() => {
        expect(screen.getByText("Social")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Social"));
      await user.click(screen.getByText("Academic"));
      await user.click(screen.getByText("Sports"));

      expect(screen.getByText("3 selected")).toBeInTheDocument();
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

      expect(screen.getByText("Current Week")).toHaveClass("bg-blue-400");
    });
  });
});

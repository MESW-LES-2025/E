"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";

interface EventFiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  category: string[];
  dateFilter: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "SOCIAL", label: "Social" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "TRAVEL", label: "Travel" },
  { value: "SPORTS", label: "Sports" },
  { value: "CULTURAL", label: "Cultural" },
  { value: "VOLUNTEERING", label: "Volunteering" },
  { value: "NIGHTLIFE", label: "Nightlife" },
];

const DATE_FILTERS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this_week", label: "Current Week" },
];

const getDateRangeForFilter = (
  filter: string,
): { from: string; to: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today": {
      const dateStr = today.toISOString().split("T")[0];
      return { from: dateStr, to: dateStr };
    }
    case "tomorrow": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];
      return { from: dateStr, to: dateStr };
    }
    case "this_week": {
      const dayOfWeek = today.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const sunday = new Date(today);
      sunday.setDate(sunday.getDate() + daysUntilSunday);
      return {
        from: today.toISOString().split("T")[0],
        to: sunday.toISOString().split("T")[0],
      };
    }
    default:
      return { from: "", to: "" };
  }
};

const getInitialDateRange = (filters: FilterValues): DateRange | undefined => {
  if (filters.dateFrom && filters.dateTo) {
    return {
      from: new Date(filters.dateFrom),
      to: new Date(filters.dateTo),
    };
  }
  return undefined;
};

export default function EventFilters({
  filters,
  onFilterChange,
}: EventFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>(
    getInitialDateRange(filters),
  );

  const updateLocalFilters = (updates: Partial<FilterValues>) => {
    setLocalFilters((prev) => ({ ...prev, ...updates }));
  };

  const toggleCategory = (value: string) => {
    const current = localFilters.category;
    const updated = current.includes(value)
      ? current.filter((c) => c !== value)
      : [...current, value];
    updateLocalFilters({ category: updated });
  };

  const handleQuickDateFilter = (filterValue: string) => {
    const { from, to } = getDateRangeForFilter(filterValue);
    updateLocalFilters({
      dateFilter: filterValue,
      dateFrom: from,
      dateTo: to,
    });
    setDate(
      from && to ? { from: new Date(from), to: new Date(to) } : undefined,
    );
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range);

    if (
      range?.from &&
      range?.to &&
      range.from.getTime() !== range.to.getTime()
    ) {
      updateLocalFilters({
        dateFilter: "",
        dateFrom: format(range.from, "yyyy-MM-dd"),
        dateTo: format(range.to, "yyyy-MM-dd"),
      });
      setIsCalendarOpen(false);
    } else if (!range) {
      updateLocalFilters({
        dateFilter: "",
        dateFrom: "",
        dateTo: "",
      });
    }
  };

  const handleReset = () => {
    const resetFilters: FilterValues = {
      category: [],
      dateFilter: "",
      dateFrom: "",
      dateTo: "",
      search: "",
    };
    setLocalFilters(resetFilters);
    setDate(undefined);
    onFilterChange(resetFilters);
  };

  // Sync localFilters when filters prop changes (e.g., from localStorage)
  useEffect(() => {
    setLocalFilters(filters);
    setDate(getInitialDateRange(filters));
  }, [filters]);

  // Auto-apply filters when they change
  useEffect(() => {
    onFilterChange(localFilters);
  }, [localFilters, onFilterChange]);

  return (
    <div className="space-y-4 pb-6 border-b">
      {/* Search Bar - Full Width */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={localFilters.search}
          onChange={(e) => updateLocalFilters({ search: e.target.value })}
          placeholder="Search events by name, location, or description..."
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          Categories:
        </span>
        {CATEGORIES.filter((c) => c.value !== "").map((cat) => {
          const isSelected = localFilters.category.includes(cat.value);
          return (
            <Badge
              key={cat.value}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? "hover:bg-primary/90 hover:shadow-md"
                  : "hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
              }`}
              onClick={() => toggleCategory(cat.value)}
            >
              {cat.label}
              {isSelected && <X className="h-3 w-3 ml-1.5" />}
            </Badge>
          );
        })}
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          When:
        </span>
        {DATE_FILTERS.map((df) => (
          <Button
            key={df.value}
            variant={
              localFilters.dateFilter === df.value ? "default" : "outline"
            }
            size="sm"
            onClick={() => handleQuickDateFilter(df.value)}
            className="text-sm"
          >
            {df.label}
          </Button>
        ))}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "MMM dd")} - {format(date.to, "MMM dd")}
                  </>
                ) : (
                  format(date.from, "MMM dd")
                )
              ) : (
                "Custom"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
        {(localFilters.category.length > 0 ||
          localFilters.dateFilter ||
          date ||
          localFilters.search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-foreground ml-auto"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

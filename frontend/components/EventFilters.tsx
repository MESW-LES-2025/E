"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
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
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
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

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-6">Filters</h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => updateLocalFilters({ search: e.target.value })}
            placeholder="Search events..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Categories
          </label>
          <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
            <PopoverTrigger asChild>
              <button className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between bg-white">
                <span className="text-sm truncate">
                  {localFilters.category.length === 0
                    ? "Select categories..."
                    : `${localFilters.category.length} selected`}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <div className="max-h-60 overflow-y-auto p-1 bg-white rounded-md border shadow-sm">
                {CATEGORIES.filter((c) => c.value !== "").map((cat) => {
                  const isSelected = localFilters.category.includes(cat.value);
                  return (
                    <div
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-sm cursor-pointer"
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm text-gray-700">{cat.label}</span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            When
          </label>

          <div className="flex flex-col gap-2 mb-3">
            {DATE_FILTERS.map((df) => (
              <button
                key={df.value}
                onClick={() => handleQuickDateFilter(df.value)}
                className={`px-4 py-2 rounded-md transition-colors text-sm ${
                  localFilters.dateFilter === df.value
                    ? "bg-blue-400 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Custom Range
            </label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                  <span className="text-sm">
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "MMM dd")} -{" "}
                          {format(date.to, "MMM dd, yyyy")}
                        </>
                      ) : (
                        format(date.from, "MMM dd")
                      )
                    ) : (
                      <span className="text-gray-400">Pick dates</span>
                    )}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                </button>
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
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

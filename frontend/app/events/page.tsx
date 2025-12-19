"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventModal from "@/components/EventModal";
import EventCard from "@/components/EventCard";
import EventFilters, { FilterValues } from "@/components/EventFilters";

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
  description: string;
  organizer: number;
  organizer_name: string;
  status: string;
  participant_count: number;
  interest_count?: number;
  is_participating: boolean;
  capacity: number | null;
  is_full: boolean;
  category: string;
}

const STORAGE_KEY_EVENTS_FILTERS = "events_filters";
const STORAGE_KEY_EVENTS_TAB = "events_active_tab";

// Load filters from localStorage
const loadFiltersFromStorage = (): FilterValues => {
  if (typeof window === "undefined") {
    return {
      category: [],
      dateFilter: "",
      dateFrom: "",
      dateTo: "",
      search: "",
    };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY_EVENTS_FILTERS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load filters from storage:", e);
  }
  return {
    category: [],
    dateFilter: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  };
};

// Save filters to localStorage
const saveFiltersToStorage = (filters: FilterValues) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_EVENTS_FILTERS, JSON.stringify(filters));
  } catch (e) {
    console.error("Failed to save filters to storage:", e);
  }
};

export default function EventsPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    category: [],
    dateFilter: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Load filters and active tab from localStorage after mount (client-side only)
  useEffect(() => {
    setMounted(true);
    const storedFilters = loadFiltersFromStorage();
    setFilters(storedFilters);
    
    // Load active tab
    if (typeof window !== "undefined") {
      try {
        const storedTab = localStorage.getItem(STORAGE_KEY_EVENTS_TAB);
        if (storedTab === "upcoming" || storedTab === "past") {
          setActiveTab(storedTab);
        }
      } catch (e) {
        console.error("Failed to load active tab from storage:", e);
      }
    }
  }, []);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY_EVENTS_TAB, activeTab);
      } catch (e) {
        console.error("Failed to save active tab to storage:", e);
      }
    }
  }, [activeTab, mounted]);

  const handleViewDetails = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalOpen(true);
  };

  const handleInterestChange = (
    eventId: number,
    isInterested: boolean,
    interestCount: number,
  ) => {
    // Update the event in both upcoming and past events arrays
    setUpcomingEvents((prevEvents) =>
      prevEvents.map((e) =>
        e.id === eventId ? { ...e, interest_count: interestCount } : e,
      ),
    );
    setPastEvents((prevEvents) =>
      prevEvents.map((e) =>
        e.id === eventId ? { ...e, interest_count: interestCount } : e,
      ),
    );
  };

  const handleParticipationChange = (
    eventId: number,
    isParticipating: boolean,
    participantCount: number,
    isFull: boolean,
  ) => {
    // Update the event in both upcoming and past events arrays
    setUpcomingEvents((prevEvents) =>
      prevEvents.map((e) =>
        e.id === eventId
          ? {
              ...e,
              participant_count: participantCount,
              is_participating: isParticipating,
              is_full: isFull,
            }
          : e,
      ),
    );
    setPastEvents((prevEvents) =>
      prevEvents.map((e) =>
        e.id === eventId
          ? {
              ...e,
              participant_count: participantCount,
              is_participating: isParticipating,
              is_full: isFull,
            }
          : e,
      ),
    );
  };

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters for upcoming events
        const params = new URLSearchParams();
        if (filters.category.length > 0) {
          filters.category.forEach((cat) => params.append("category", cat));
        }
        if (filters.dateFilter)
          params.append("date_filter", filters.dateFilter);
        if (filters.dateFrom) params.append("date_from", filters.dateFrom);
        if (filters.dateTo) params.append("date_to", filters.dateTo);
        if (filters.search) params.append("search", filters.search);

        const queryString = params.toString();
        const upcomingUrl = `${base}/events/upcoming/${
          queryString ? `?${queryString}` : ""
        }`;

        // Fetch upcoming events
        const upcomingResponse = await fetch(upcomingUrl);
        if (!upcomingResponse.ok)
          throw new Error("Failed to fetch upcoming events");
        const upcomingData = await upcomingResponse.json();
        // Handle both array and object with results property
        setUpcomingEvents(
          Array.isArray(upcomingData)
            ? upcomingData
            : upcomingData.results ?? [],
        );

        // Fetch past events (no filters for past events)
        const pastResponse = await fetch(`${base}/events/past/`);
        if (!pastResponse.ok) throw new Error("Failed to fetch past events");
        const pastData = await pastResponse.json();
        // Handle both array and object with results property
        setPastEvents(
          Array.isArray(pastData) ? pastData : pastData.results ?? [],
        );
      } catch (err) {
        console.error(err);
        setError("Could not load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [base, filters]);

  // Save filters to localStorage whenever they change (only after mount)
  useEffect(() => {
    if (mounted) {
      saveFiltersToStorage(filters);
    }
  }, [filters, mounted]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEventId(null);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Events</h1>
              <p className="text-muted-foreground text-lg">
                Discover and filter events happening in Porto
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal Filter Bar */}
        <div className="mb-8">
          <EventFilters filters={filters} onFilterChange={setFilters} />
        </div>

        {/* EVENTS CONTENT */}
        <main className="flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-6 mb-8 border-b-2 border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-6 py-4 font-semibold text-lg transition-all border-b-[3px] -mb-px ${
                activeTab === "upcoming"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
              }`}
            >
              Upcoming Events
              {!loading && (
                <span className={`ml-3 text-base font-medium ${
                  activeTab === "upcoming" ? "text-primary" : "text-muted-foreground"
                }`}>
                  ({upcomingEvents.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`px-6 py-4 font-semibold text-lg transition-all border-b-[3px] -mb-px ${
                activeTab === "past"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
              }`}
            >
              Past Events
              {!loading && (
                <span className={`ml-3 text-base font-medium ${
                  activeTab === "past" ? "text-primary" : "text-muted-foreground"
                }`}>
                  ({pastEvents.length})
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                  <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
                </div>
                <p className="text-muted-foreground mt-4">Loading events...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-destructive font-medium">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : activeTab === "upcoming" ? (
            <>
              {upcomingEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <p className="text-muted-foreground text-lg">
                      No upcoming events found matching your filters
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        setFilters({
                          category: [],
                          dateFilter: "",
                          dateFrom: "",
                          dateTo: "",
                          search: "",
                        })
                      }
                    >
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {pastEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No past events are available.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {modalOpen && selectedEventId && (
          <EventModal
            id={selectedEventId}
            onClose={handleCloseModal}
            onInterestChange={handleInterestChange}
            onParticipationChange={handleParticipationChange}
          />
        )}
      </div>
    </div>
  );
}

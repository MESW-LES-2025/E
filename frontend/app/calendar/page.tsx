"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/utils";
import { ErasmusEvent } from "@/lib/types";
import { isAuthenticated } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import EventModal from "@/components/EventModal";
import EventCard from "@/components/EventCard";
import { getInterestedEvents, getMyOrganizedEvents } from "@/lib/events";

const EVENTS_ENDPOINT_BASE = "events";

enum EndpointType {
  ALL = "",
  PARTICIPATING = "Participating",
  INTERESTED = "Interested",
  ORGANIZED = "Organized",
}

const ENDPOINT_CONFIG: Record<
  EndpointType,
  { endpoint: string; style: string }
> = {
  [EndpointType.ALL]: {
    endpoint: EVENTS_ENDPOINT_BASE,
    style: "bg-green-400 text-primary-foreground rounded-lg",
  },
  [EndpointType.PARTICIPATING]: {
    endpoint: `${EVENTS_ENDPOINT_BASE}/participating/`,
    style: "bg-lime-400 text-white rounded-lg",
  },
  [EndpointType.INTERESTED]: {
    endpoint: `${EVENTS_ENDPOINT_BASE}/interested/`,
    style: "bg-emerald-400 text-white rounded-lg",
  },
  [EndpointType.ORGANIZED]: {
    endpoint: `${EVENTS_ENDPOINT_BASE}/organized/`,
    style: "bg-teal-400 text-white rounded-lg",
  },
};

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const STORAGE_KEY_CALENDAR_FILTER = "calendar_filter";

// Load calendar filter from localStorage
const loadCalendarFilterFromStorage = (): EndpointType => {
  if (typeof window === "undefined") return EndpointType.ALL;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CALENDAR_FILTER);
    if (stored && Object.values(EndpointType).includes(stored as EndpointType)) {
      return stored as EndpointType;
    }
  } catch (e) {
    console.error("Failed to load calendar filter from storage:", e);
  }
  return EndpointType.ALL;
};

// Save calendar filter to localStorage
const saveCalendarFilterToStorage = (filter: EndpointType) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CALENDAR_FILTER, filter);
  } catch (e) {
    console.error("Failed to save calendar filter to storage:", e);
  }
};

export default function EventsCalendar() {
  const date = new Date();
  const router = useRouter();
  const [events, setEvents] = useState<ErasmusEvent[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<EndpointType>(EndpointType.ALL);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(date);
  const [selectedDay, setSelectedDay] = useState<Date>(date);
  const [user, setUser] = useState<User | null>(null);

  // Load filter from localStorage after mount (client-side only)
  useEffect(() => {
    setMounted(true);
    const storedFilter = loadCalendarFilterFromStorage();
    setFilter(storedFilter);
  }, []);

  // Save filter to localStorage whenever it changes (only after mount)
  useEffect(() => {
    if (mounted) {
      saveCalendarFilterToStorage(filter);
    }
  }, [filter, mounted]);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/profile/login");
    } else {
      // Fetch user info
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
      fetchWithAuth(`${base}/auth/users/me/`)
        .then((res) => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setUser(data);
        })
        .catch(() => {
          // Silently fail
        });
    }
  }, [router]);

  const fetchEvents = useCallback(async (filter: EndpointType) => {
    setLoading(true);

    try {
      let data: ErasmusEvent[];

      // Use dedicated functions for consistency when available
      if (filter === EndpointType.INTERESTED) {
        const events = await getInterestedEvents();
        // Convert Event[] to ErasmusEvent[] format
        data = events.map((event) => ({
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location || "",
          description: event.description || "",
          organizerId: String(event.organizer_name || ""),
          registeredUsersIds: [],
          interestedUsersIds: [],
          category: event.category,
          participant_count: event.participant_count,
          interest_count: event.interest_count,
          is_participating: event.is_participating,
          is_interested: event.is_interested,
          is_full: event.is_full,
        }));
      } else if (filter === EndpointType.ORGANIZED) {
        const events = await getMyOrganizedEvents();
        // Convert Event[] to ErasmusEvent[] format
        data = events.map((event) => ({
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location || "",
          description: event.description || "",
          organizerId: String(event.organizer_name || ""),
          registeredUsersIds: [],
          interestedUsersIds: [],
          category: event.category,
          participant_count: event.participant_count,
          interest_count: event.interest_count,
          is_participating: event.is_participating,
          is_interested: event.is_interested,
          is_full: event.is_full,
        }));
      } else {
        // For ALL and PARTICIPATING, use apiRequest as before
        const endpoint = ENDPOINT_CONFIG[filter].endpoint;
        const response = await apiRequest(endpoint);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        data = await response.json();
      }

      setEvents(data);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchEvents(filter);
    }
  }, [filter, fetchEvents]);

  const eventDates: Date[] = useMemo(
    () => events.map((event) => new Date(event.date)),
    [events],
  );

  const eventsForSelectedDay = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return selectedDay?.toDateString() === eventDate.toDateString();
    });
  }, [selectedDay, events]);

  const calendarClasses = useMemo(
    () => ({
      past: "opacity-50",
      event: ENDPOINT_CONFIG[filter].style,
      today: "bg-blue-300 text-white rounded-lg",
      selected: "bg-primary text-primary-foreground rounded-lg",
    }),
    [filter],
  );

  const availableFilters = useMemo(() => {
    if (user?.role === "ORGANIZER") {
      return [
        {
          type: EndpointType.ALL,
          label: "All Events",
          onClick: () => setFilter(EndpointType.ALL),
        },
        {
          type: EndpointType.ORGANIZED,
          label: "Organized",
          onClick: () => setFilter(EndpointType.ORGANIZED),
        },
      ];
    }
    return [
      {
        type: EndpointType.ALL,
        label: "All Events",
        onClick: () => setFilter(EndpointType.ALL),
      },
      {
        type: EndpointType.PARTICIPATING,
        label: "Participating",
        onClick: () => setFilter(EndpointType.PARTICIPATING),
      },
      {
        type: EndpointType.INTERESTED,
        label: "Interested",
        onClick: () => setFilter(EndpointType.INTERESTED),
      },
    ];
  }, [user]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Event Calendar</h1>
        <p className="text-muted-foreground text-lg">
          View your events in a calendar format
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap gap-2 mb-6 justify-center lg:justify-start">
            {availableFilters.map(({ type, label, onClick }) => (
              <Button
                key={type}
                variant={filter === type ? "default" : "outline"}
                onClick={onClick}
                className="font-medium"
              >
                {label}
              </Button>
            ))}
          </div>

        <div className="flex justify-center bg-card p-6 rounded-lg border">
          <Calendar
            mode="single"
            className="rounded-lg [--cell-size:--spacing(12)]"
            modifiers={{
              past: (date) => date.getTime() < new Date().setHours(0, 0, 0, 0),
              event: eventDates,
            }}
            modifiersClassNames={{
              past: calendarClasses.past,
              event: calendarClasses.event,
              today: "bg-primary/20 text-primary font-bold rounded-lg border-2 border-primary",
              selected: "bg-primary text-primary-foreground rounded-lg font-bold",
            }}
            fixedWeeks
            onDayClick={(day) => setSelectedDay(day)}
            onMonthChange={(month) => {
              setCurrentMonth(month);
            }}
            disabled={(date) =>
              loading ||
              date.getMonth() !== currentMonth.getMonth() ||
              date.getFullYear() !== currentMonth.getFullYear()
            }
          />
        </div>
        <Button
          variant="default"
          className="mt-6 w-full max-w-[400px] mx-auto font-semibold"
          onClick={async () => {
            try {
              const base =
                process.env.NEXT_PUBLIC_API_BASE_URL ||
                "http://localhost:8000/api";

              const response = await fetchWithAuth(
                `${base}/events/export-calendar/`,
                {
                  method: "GET",
                },
              );
              if (!response.ok) {
                throw new Error("Failed to export calendar");
              }

              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);

              const a = document.createElement("a");
              a.href = url;
              a.download = "my_events.ics";
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (err) {
              console.error(err);
              alert("Could not export calendar. Try again later.");
            }
          }}
        >
          Export My Events (.ics)
        </Button>
        </div>

        <div className="flex-1">
        <div className="bg-card p-6 rounded-lg border min-h-[400px]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-muted-foreground mt-4">Loading events...</p>
            </div>
          ) : eventsForSelectedDay.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {selectedDay
                  ? `No ${filter.toLowerCase()} events are planned for ${selectedDay.toLocaleDateString()}`
                  : "No date selected"}
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-6 text-center">
                {filter === EndpointType.ALL
                  ? `All events on ${selectedDay?.toLocaleDateString()}`
                  : `${filter} events on ${selectedDay?.toLocaleDateString()}`}
              </h3>
              <div className="flex flex-wrap justify-center gap-6 max-h-[calc(100vh-20rem)] overflow-y-auto">
                {eventsForSelectedDay.map((event) => (
                  <div key={event.id} className="w-full max-w-sm">
                    <EventCard
                      event={event}
                      onViewDetails={(eventId) => {
                        setSelectedEventId(eventId);
                        setModalOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {modalOpen && (
        <EventModal
          id={selectedEventId}
          onClose={() => {
            setModalOpen(false);
            setSelectedEventId(null);
          }}
          onInterestChange={(eventId, isInterested, interestCount) => {
            // Update the event in the events array
            setEvents((prevEvents) =>
              prevEvents.map((e) =>
                e.id === eventId
                  ? {
                      ...e,
                      interest_count: interestCount,
                      is_interested: isInterested,
                    }
                  : e,
              ),
            );
          }}
          onParticipationChange={(
            eventId,
            isParticipating,
            participantCount,
            isFull,
          ) => {
            // Update the event in the events array
            setEvents((prevEvents) =>
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
          }}
        />
      )}
    </div>
  );
}

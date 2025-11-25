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

export default function EventsCalendar() {
  const date = new Date();
  const router = useRouter();
  const [events, setEvents] = useState<ErasmusEvent[]>([]);
  const [filter, setFilter] = useState<EndpointType>(EndpointType.ALL);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(date);
  const [selectedDay, setSelectedDay] = useState<Date>(date);
  const [user, setUser] = useState<User | null>(null);

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
    <div className="flex flex-col lg:flex-row justify-center">
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex space-x-2 mb-4 justify-center">
          {availableFilters.map(({ type, label, onClick }) => (
            <Button
              key={type}
              variant={filter === type ? "default" : "outline"}
              onClick={onClick}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            className="rounded-lg border [--cell-size:--spacing(12)]"
            modifiers={{
              past: (date) => date.getTime() < new Date().setHours(0, 0, 0, 0),
              event: eventDates,
            }}
            modifiersClassNames={{
              past: calendarClasses.past,
              event: calendarClasses.event,
              today: "bg-blue-300 text-white rounded-lg",
              selected: "bg-primary text-primary-foreground rounded-lg",
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
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <p className="text-center text-gray-500">Loading events...</p>
        ) : eventsForSelectedDay.length === 0 ? (
          <p className="text-center text-gray-500">
            {selectedDay
              ? `No ${filter.toLowerCase()} events are planned for ${selectedDay.toLocaleDateString()}`
              : "No date selected"}
          </p>
        ) : (
          <>
            <p className="text-center text-gray-500 sticky mb-6.5 top-0 bg-gray-50">
              {filter === EndpointType.ALL
                ? `All events planned for ${selectedDay?.toLocaleDateString()}:`
                : `${filter} events planned for ${selectedDay?.toLocaleDateString()}:`}
            </p>
            <div className="flex flex-wrap justify-center gap-4 max-h-[calc(100vh-13.5rem)] overflow-y-auto">
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

      {modalOpen && (
        <EventModal
          id={selectedEventId}
          onClose={() => {
            setModalOpen(false);
            setSelectedEventId(null);
          }}
        />
      )}
    </div>
  );
}

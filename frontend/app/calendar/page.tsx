"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { fetchWrapped } from "@/lib/utils";
import { ErasmusEvent } from "@/lib/types";
import EventCard from "@/components/EventCard";
import { isAuthenticated } from "@/lib/auth";
import { useRouter } from "next/navigation";

const EVENTS_ENDPOINT_BASE = "events";

enum EndpointType {
  ALL = "",
  REGISTERED = "Registered",
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
  [EndpointType.REGISTERED]: {
    endpoint: `${EVENTS_ENDPOINT_BASE}/registered/`,
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

export default function EventsCalendar() {
  const date = new Date();
  const router = useRouter();
  const [events, setEvents] = useState<ErasmusEvent[]>([]);
  const [filter, setFilter] = useState<EndpointType>(EndpointType.ALL);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(date);
  const [selectedDay, setSelectedDay] = useState<Date>(date);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/profile/login");
    }
  }, [router]);

  const fetchEvents = useCallback(async (filter: EndpointType) => {
    setLoading(true);

    const endpoint = ENDPOINT_CONFIG[filter].endpoint;

    try {
      const response = await fetchWrapped(endpoint);
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data: ErasmusEvent[] = await response.json();
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
      event: ENDPOINT_CONFIG[filter].style,
      today: "bg-blue-300 text-white rounded-lg",
      selected: "bg-primary text-primary-foreground rounded-lg",
    }),
    [filter],
  );

  const filterButtons = [
    {
      type: EndpointType.ALL,
      label: "All Events",
      onClick: () => setFilter(EndpointType.ALL),
    },
    {
      type: EndpointType.REGISTERED,
      label: "Registered",
      onClick: () => setFilter(EndpointType.REGISTERED),
    },
    {
      type: EndpointType.INTERESTED,
      label: "Interested",
      onClick: () => setFilter(EndpointType.INTERESTED),
    },
    {
      type: EndpointType.ORGANIZED,
      label: "Organized",
      onClick: () => setFilter(EndpointType.ORGANIZED),
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row justify-center">
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex space-x-2 mb-4 justify-center">
          {filterButtons.map(({ type, label, onClick }) => (
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
              event: eventDates,
            }}
            modifiersClassNames={{
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
                <EventCard
                  key={event.id}
                  id={event.id}
                  name={event.name}
                  date={event.date}
                  location={event.location}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

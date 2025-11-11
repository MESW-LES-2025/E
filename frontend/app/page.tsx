"use client";

import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import { ErasmusEvent } from "@/lib/types";

export default function Home() {
  const [events, setEvents] = useState<ErasmusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/upcoming/`,
        );
        if (!response.ok) throw new Error("Failed to fetch events");

        const data: ErasmusEvent[] = await response.json();
        setEvents(data);
      } catch (err: unknown) {
        setError((err as Error).message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <p>Loading events...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Upcoming Events</h2>

      {events.length === 0 && <p>No events available</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            id={event.id}
            name={event.name}
            date={event.date}
            location={event.location}
          />
        ))}
      </div>
    </div>
  );
}

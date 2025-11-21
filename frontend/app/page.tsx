"use client";

import { useEffect, useState } from "react";
import { ErasmusEvent } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventModal from "@/components/EventModal";

export default function Home() {
  const [events, setEvents] = useState<ErasmusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const base =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
        const response = await fetch(`${base}/events/upcoming/`);
        if (!response.ok) throw new Error("Failed to fetch events");
        const data: ErasmusEvent[] = await response.json();
        setEvents(data || []);
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
          <Card key={event.id} className="shadow hover:shadow-lg transition">
            <CardContent>
              <h3 className="text-xl font-semibold">{event.name}</h3>
              <p className="text-sm text-gray-600">
                {new Date(event.date).toLocaleString()}
              </p>
              {event.location && (
                <p className="text-sm text-gray-700 mt-1">
                  📍 {event.location}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedEventId(String(event.id));
                  setModalOpen(true);
                }}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
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

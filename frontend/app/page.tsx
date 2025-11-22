"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventModal from "@/components/EventModal";

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
  is_participating: boolean;
  capacity: number | null;
  is_full: boolean;
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${base}/events/upcoming/`);
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.results;
        setEvents(list ?? []);
      } catch {
        setError("Could not load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [base]);

  if (loading) return <p>Loading events...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!events.length) return <p>No events available</p>;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Upcoming Events</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <Card
            key={event.id}
            className="shadow transition relative hover:shadow-lg"
          >
            {event.status === "Canceled" && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md">
                Canceled
              </span>
            )}

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

      {modalOpen && selectedEventId && (
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

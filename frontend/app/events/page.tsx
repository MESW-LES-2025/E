"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventModal from "@/components/EventModal";

type Event = {
  id: number;
  name: string;
  date: string;
  status: string;
  location?: string;
};

export default function EventsPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch upcoming events
        const upcomingResponse = await fetch(`${base}/events/upcoming/`);
        if (!upcomingResponse.ok)
          throw new Error("Failed to fetch upcoming events");
        const upcomingData: { results: Event[] } =
          await upcomingResponse.json();
        setUpcomingEvents(upcomingData.results ?? []);

        // Fetch past events
        const pastResponse = await fetch(`${base}/events/past/`);
        if (!pastResponse.ok) throw new Error("Failed to fetch past events");
        const pastData: { results: Event[] } = await pastResponse.json();
        setPastEvents(pastData.results ?? []);
      } catch (err) {
        console.error(err);
        setError("Could not load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [base]);

  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading events...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderEventCard = (event: Event) => (
    <Card
      key={event.id}
      className="hover:shadow-lg transition-shadow relative flex flex-col"
    >
      {event.status === "Canceled" && (
        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md z-10">
          Canceled
        </span>
      )}

      <CardHeader>
        <CardTitle className="line-clamp-2">{event.name}</CardTitle>
        <CardDescription>
          {new Date(event.date).toLocaleString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {event.location ? (
          <p className="text-sm text-muted-foreground">📍 {event.location}</p>
        ) : (
          <p className="text-sm text-muted-foreground opacity-0">
            {/* Spacer to maintain consistent height */}
            &nbsp;
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSelectedEventId(String(event.id));
            setModalOpen(true);
          }}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      {/* Upcoming Events Section */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Upcoming Events</h1>
        </div>

        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No upcoming events are available at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map(renderEventCard)}
          </div>
        )}
      </div>

      {/* Past Events Section */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Past Events</h2>
        </div>

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
            {pastEvents.map(renderEventCard)}
          </div>
        )}
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

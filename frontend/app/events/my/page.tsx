"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { fetchWithAuth } from "@/lib/auth";
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

type Event = {
  id: number;
  name: string;
  date: string;
  status: string;
  location?: string;
  description?: string;
  capacity?: number;
  participant_count?: number;
  is_participating?: boolean;
  organizer_name?: string;
};

export default function MyEventsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const authenticated = isAuthenticated();
    setAuthed(authenticated);

    if (!authenticated) {
      router.replace("/profile/login");
      return;
    }

    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user profile to get participating event IDs
        const profile = await getProfile();
        const eventIds = profile.participating_events || [];

        if (eventIds.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        // Fetch each event by ID
        const eventPromises = eventIds.map(async (eventId: number) => {
          try {
            const response = await fetchWithAuth(
              `${API_BASE}/events/${eventId}/`,
              {
                method: "GET",
              },
            );

            if (!response.ok) {
              console.error(`Failed to fetch event ${eventId}`);
              return null;
            }

            return response.json();
          } catch (err) {
            console.error(`Error fetching event ${eventId}:`, err);
            return null;
          }
        });

        const eventResults = await Promise.all(eventPromises);
        // Filter out null results and sort by date
        const validEvents = eventResults
          .filter((event): event is Event => event !== null)
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        setEvents(validEvents);
      } catch (err) {
        console.error("Failed to load events:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load your events",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [router]);

  if (!mounted || !authed || loading) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading your events...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="text-muted-foreground mt-2">
          Events you are participating in
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You are not participating in any events yet.
            </p>
            <Button variant="outline" onClick={() => router.push("/events")}>
              Browse Events
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
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
                  <p className="text-sm text-muted-foreground">
                    📍 {event.location}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground opacity-0">
                    {/* Spacer to maintain consistent height */}
                    &nbsp;
                  </p>
                )}
                {event.organizer_name && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Organized by {event.organizer_name}
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
          ))}
        </div>
      )}

      {modalOpen && selectedEventId && (
        <EventModal
          id={selectedEventId}
          onClose={() => {
            setModalOpen(false);
            setSelectedEventId(null);
            // Refresh events after modal closes in case participation changed
            if (authed) {
              const fetchMyEvents = async () => {
                try {
                  const profile = await getProfile();
                  const eventIds = profile.participating_events || [];

                  if (eventIds.length === 0) {
                    setEvents([]);
                    return;
                  }

                  const eventPromises = eventIds.map(
                    async (eventId: number) => {
                      try {
                        const response = await fetchWithAuth(
                          `${API_BASE}/events/${eventId}/`,
                          {
                            method: "GET",
                          },
                        );

                        if (!response.ok) return null;
                        return response.json();
                      } catch {
                        return null;
                      }
                    },
                  );

                  const eventResults = await Promise.all(eventPromises);
                  const validEvents = eventResults
                    .filter((event): event is Event => event !== null)
                    .sort(
                      (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime(),
                    );

                  setEvents(validEvents);
                } catch (err) {
                  console.error("Failed to refresh events:", err);
                }
              };
              fetchMyEvents();
            }
          }}
        />
      )}
    </div>
  );
}

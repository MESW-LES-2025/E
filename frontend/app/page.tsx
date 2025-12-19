"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventModal from "@/components/EventModal";
import EventCard from "@/components/EventCard";
import {
  listOrganizations,
  type PublicOrganization,
} from "@/lib/organizations";
import OrganizationCard from "@/components/OrganizationCard";

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

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch Events + Orgs
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        setError(null);

        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}/events/upcoming/`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch events");

        const data = await response.json();
        const allEvents = Array.isArray(data) ? data : (data.results ?? []);
        // Show only first 6 events on homepage (curated selection)
        setEvents(allEvents.slice(0, 6));
      } catch (err) {
        console.error(err);
        setError("Could not load events");
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    const fetchOrganizations = async () => {
      try {
        const orgsData = await listOrganizations();
        // Show only first 3 organizations on homepage
        setOrganizations(orgsData.slice(0, 3));
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setOrgsLoading(false);
      }
    };

    fetchEvents();
    fetchOrganizations();
  }, []);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEventId(null);
  };

  const handleViewDetails = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalOpen(true);
  };

  const handleInterestChange = (
    eventId: number,
    isInterested: boolean,
    interestCount: number,
  ) => {
    setEvents((prevEvents) =>
      prevEvents.map((e) =>
        e.id === eventId
          ? { ...e, interest_count: interestCount, is_interested: isInterested }
          : e,
      ),
    );
  };

  const handleParticipationChange = (
    eventId: number,
    isParticipating: boolean,
    participantCount: number,
    isFull: boolean,
  ) => {
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
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Discover Events in Porto&apos;s
              </span>
              <br />
              <span className="text-foreground">Erasmus Community</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with fellow students, explore cultural activities, and make
              unforgettable memories in the vibrant city of Porto
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-lg px-8 hover:scale-105 hover:shadow-lg transition-all duration-200 hover:bg-primary hover:brightness-110">
                <Link href="/events">Explore Events</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 hover:scale-105 hover:shadow-lg hover:border-primary hover:bg-primary/10 transition-all duration-200">
                <Link href="/organizations">Browse Organizations</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
        <div className="space-y-16">
          {/* Events Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">
                  Featured Events
                </h2>
                <p className="text-muted-foreground">
                  Discover exciting events happening in Porto
                </p>
              </div>
              <Button asChild variant="outline" size="lg">
                <Link href="/events">View All Events</Link>
              </Button>
            </div>

            {eventsLoading ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
                  </div>
                  <p className="text-muted-foreground mt-4">
                    Loading events...
                  </p>
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
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground text-lg">
                    No upcoming events at the moment.
                  </p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/events">Browse All Events</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Organizations Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">
                  Featured Organizations
                </h2>
                <p className="text-muted-foreground">
                  Connect with organizations creating amazing events
                </p>
              </div>
              <Button asChild variant="outline" size="lg">
                <Link href="/organizations">View All Organizations</Link>
              </Button>
            </div>

            {orgsLoading ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-muted-foreground mt-4">
                    Loading organizations...
                  </p>
                </CardContent>
              </Card>
            ) : organizations.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">
                    No organizations are available at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org) => (
                  <OrganizationCard
                    key={org.id}
                    organization={org}
                    referrer="/"
                  />
                ))}
              </div>
            )}
          </section>
        </div>

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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EventModal from "@/components/EventModal";
import EventCard from "@/components/EventCard";
import EventFilters, { FilterValues } from "@/components/EventFilters";
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
  const [filters, setFilters] = useState<FilterValues>({
    category: [],
    dateFilter: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // NEW: Mobile filters toggle
  const [showFilters, setShowFilters] = useState(false);

  // Fetch Events + Orgs
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        setError(null);

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
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/upcoming/${
          queryString ? `?${queryString}` : ""
        }`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch events");

        const data = await response.json();
        setEvents(Array.isArray(data) ? data : (data.results ?? []));
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
        setOrganizations(orgsData.slice(0, 6));
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setOrgsLoading(false);
      }
    };

    fetchEvents();
    fetchOrganizations();
  }, [filters]);

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
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="space-y-12">
        {/* Events Section */}
        <section>
          {/* MOBILE FILTERS BUTTON */}
          <Button
            className="mb-4 md:hidden"
            variant="outline"
            onClick={() => setShowFilters(true)}
          >
            Filters
          </Button>

          <div className="flex gap-6">
            {/* FILTER SIDEBAR */}
            <aside
              className={`
                w-80 flex-shrink-0
                md:block
                ${showFilters ? "fixed inset-0 bg-black/40 z-50" : "hidden md:block"}
              `}
            >
              {/* Sidebar Panel */}
              <div
                className={`
                  bg-white h-full w-80 p-4 shadow-xl
                  ${showFilters ? "absolute left-0 top-0" : "md:static"}
                `}
              >
                {/* Mobile Close Bar */}
                <div className="flex justify-between items-center mb-4 md:hidden">
                  <h3 className="text-xl font-semibold">Filters</h3>
                  <Button variant="ghost" onClick={() => setShowFilters(false)}>
                    Close
                  </Button>
                </div>

                <EventFilters filters={filters} onFilterChange={setFilters} />
              </div>
            </aside>

            {/* EVENTS LIST */}
            <main className="flex-1 min-w-0 flex flex-col">
              <h2 className="text-3xl font-bold mb-6">Upcoming Events</h2>

              <div className="flex-1 overflow-y-auto pr-2">
                {eventsLoading ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Loading events...</p>
                    </CardContent>
                  </Card>
                ) : error ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-red-500">{error}</p>
                    </CardContent>
                  </Card>
                ) : events.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No events found matching your filters
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                )}
              </div>
            </main>
          </div>
        </section>

        {/* Organizations Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Organizations</h2>
            <Button variant="outline" asChild>
              <Link href="/organizations">View All</Link>
            </Button>
          </div>

          {orgsLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Loading organizations...
                </p>
              </CardContent>
            </Card>
          ) : organizations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
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

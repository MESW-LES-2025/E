"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import {
  listOrganizations,
  type PublicOrganization,
} from "@/lib/organizations";

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
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
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
        // Handle both paginated (results) and non-paginated (list) responses
        const eventsList = Array.isArray(data) ? data : (data.results ?? []);
        setEvents(eventsList.slice(0, 6)); // Show only first 6 events
      } catch (err) {
        console.error(err);
        setError("Could not load events");
      } finally {
        setEventsLoading(false);
      }
    };

    const fetchOrganizations = async () => {
      try {
        const orgsData = await listOrganizations();
        setOrganizations(orgsData.slice(0, 6)); // Show only first 6 organizations
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setOrgsLoading(false);
      }
    };
    fetchEvents();
    fetchOrganizations();
  }, [base]);

  const getOrganizationTypeLabel = (type: string | null) => {
    if (!type) return "Not specified";
    const typeMap: Record<string, string> = {
      COMPANY: "Company",
      NON_PROFIT: "Non-profit",
      COMMUNITY: "Community",
      EDUCATIONAL: "Educational",
      GOVERNMENT: "Government",
      OTHER: "Other",
    };
    return typeMap[type] || type;
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="space-y-12">
        {/* Events Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Upcoming Events</h2>
            <Button variant="outline" asChild>
              <Link href="/events">View All</Link>
            </Button>
          </div>
          {eventsLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading events...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Error: {error}</p>
              </CardContent>
            </Card>
          ) : !events.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No events are available at the moment.
                </p>
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
                <Card
                  key={org.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{org.name}</CardTitle>
                    <CardDescription>
                      {getOrganizationTypeLabel(org.organization_type)}
                      {org.event_count > 0 && (
                        <span className="ml-2">
                          • {org.event_count} event
                          {org.event_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {org.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                        {org.description}
                      </p>
                    )}
                    {org.city && org.country && (
                      <p className="text-sm text-muted-foreground">
                        📍 {org.city}, {org.country}
                      </p>
                    )}
                    {org.owner_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        By {org.owner_name}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" asChild>
                      <Link
                        href={`/organizations/${org.id}`}
                        onClick={() =>
                          sessionStorage.setItem("org_detail_referrer", "/")
                        }
                      >
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

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
    </div>
  );
}

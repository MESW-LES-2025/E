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
import EventCard from "@/components/EventCard";
import EventFilters, { FilterValues } from "@/components/EventFilters";
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
        setOrganizations(orgsData.slice(0, 6)); // Show only first 6 organizations
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
        {/* Events Section with Filters */}
        <section>
          <div className="flex gap-6 h-[calc(100vh-9rem)]">
            {/* Left Column - Filters */}
            <aside className="w-80 flex-shrink-0">
              <EventFilters filters={filters} onFilterChange={setFilters} />
            </aside>

            {/* Right Column - Events */}
            <main className="flex-1 min-w-0 flex flex-col">
              <h2 className="text-3xl font-bold mb-6 flex-shrink-0">
                Upcoming Events
              </h2>

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
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
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
          <EventModal id={selectedEventId} onClose={handleCloseModal} />
        )}
      </div>
    </div>
  );
}

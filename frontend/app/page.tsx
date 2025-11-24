"use client";

import { useEffect, useState } from "react";
import EventModal from "@/components/EventModal";
import EventCard from "@/components/EventCard";
import EventFilters, { FilterValues } from "@/components/EventFilters";

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
  const [loading, setLoading] = useState(true);
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
        setLoading(true);
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
      } catch {
        setError("Could not load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [filters]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEventId(null);
  };

  const handleViewDetails = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalOpen(true);
  };

  if (loading) return <p>Loading events...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
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
          {events.length === 0 ? (
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

      {modalOpen && selectedEventId && (
        <EventModal id={selectedEventId} onClose={handleCloseModal} />
      )}
    </div>
  );
}

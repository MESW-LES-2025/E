"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { fetchWithHeaders } from "@/lib/utils";

enum EndpointType {
  ALL = "all",
  REGISTERED = "registered",
  INTERESTED = "interested",
  ORGANIZED = "organized",
}

export default function EventsCalendar() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState<EndpointType>(EndpointType.ALL);
  const [loading, setLoading] = useState(false);

  const endpointBase = process.env.NEXT_PUBLIC_API_BASE_URL + "/events";

  const endpoints = useMemo(
    () => ({
      [EndpointType.ALL]: `${endpointBase}/upcoming`,
      [EndpointType.REGISTERED]: `${endpointBase}/registered/`,
      [EndpointType.INTERESTED]: `${endpointBase}/interested/`,
      [EndpointType.ORGANIZED]: `${endpointBase}/organized/`,
    }),
    [endpointBase],
  );

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);

      const endpoint = endpoints[filter];

      try {
        const response = await fetchWithHeaders(endpoint);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();
        const events = data.results;
        setEvents(events);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [filter, endpoints]);

  return (
    <div className="flex flex-col lg:flex-row justify-center">
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex space-x-2 mb-4 justify-center">
          <Button
            variant={filter === EndpointType.ALL ? "default" : "outline"}
            onClick={() => setFilter(EndpointType.ALL)}
          >
            All Events
          </Button>
          <Button
            variant={filter === EndpointType.REGISTERED ? "default" : "outline"}
            onClick={() => setFilter(EndpointType.REGISTERED)}
          >
            Registered
          </Button>
          <Button
            variant={filter === EndpointType.INTERESTED ? "default" : "outline"}
            onClick={() => setFilter(EndpointType.INTERESTED)}
          >
            Interested
          </Button>
          <Button
            variant={filter === EndpointType.ORGANIZED ? "default" : "outline"}
            onClick={() => setFilter(EndpointType.ORGANIZED)}
          >
            Organized
          </Button>
        </div>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            className="rounded-lg border [--cell-size:--spacing(14)] md:[--cell-size:--spacing(14)]"
            buttonVariant="ghost"
          />
        </div>
      </div>

      <div className="flex-1 p-4"></div>
      {events.length && !loading}
      {/* disable errors */}
    </div>
  );
}

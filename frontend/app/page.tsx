"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import TestComponent from "../components/TestComponent";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Event = {
  name: string;
  date: string;
};

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const data: { results: Event[] } = await response.json();
        setEvents(data.results);
      } catch (err: unknown) {
        setError((err as Error).message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  console.log("console.log events:", events);
  console.log("events length:", events.length);
  return (
    <div>
      <h1>Hello, World!</h1>
      <p>Welcome to the home page!</p>
      <p>Testing frontend deployment!!</p>
      <br />
      API fetch example:
      <br />
      <TestComponent />
      <br />
      Shadcn UI examples:
      <br />
      <Button>Click Me</Button>
      <Calendar
        mode="single"
        className="rounded-md border shadow-sm"
        captionLayout="dropdown"
      />
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
            <SelectItem value="grapes">Grapes</SelectItem>
            <SelectItem value="pineapple">Pineapple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <br />
      <h2>Events:</h2>
      {loading ? (
        <p>Loading events...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : events.length > 0 ? (
        <ul>
          {events.map((event) => (
            <li key={event.name}>
              {event.name} — {new Date(event.date).toLocaleString()}
            </li>
          ))}
        </ul>
      ) : (
        <p>No events available</p>
      )}
    </div>
  );
}

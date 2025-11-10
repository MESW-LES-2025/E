import React from "react";

export async function generateStaticParams() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
  try {
    const res = await fetch(`${base}/events/`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const events = Array.isArray(data) ? data : data.results ?? [];
    return events.map((ev: any) => ({ id: String(ev.id) }));
  } catch {
    return [];
  }
}

type ParamsPromise = Promise<{ id: string }>;

export default async function EventPage({ params }: { params: ParamsPromise }) {
  // params is a Promise here — unwrap it
  const { id } = await params;

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
  const res = await fetch(`${base}/events/${id}/`, { cache: "no-store" });

  if (!res.ok) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Event not found</h1>
        <p>Status: {res.status}</p>
      </div>
    );
  }

  const event = await res.json();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">
        {event.name ?? event.title}
      </h1>

      {event.date && (
        <p className="mt-2">
          <strong>Date:</strong>{" "}
          <span className="font-normal">{new Date(event.date ?? event.datetime).toLocaleString()}</span>
        </p>
      )}

      {event.location && (
        <p className="mt-2">
          <strong>Location:</strong>{" "}
          <span className="font-normal">{event.location}</span>
        </p>
      )}

      {event.description && (
        <p className="mt-2">
          <strong>Description:</strong>{" "}
          <div className="mt-2 whitespace-pre-wrap font-normal">
          {event.description}
        </div>
        </p>
      )}
    </div>
  );
}
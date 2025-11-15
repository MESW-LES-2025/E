"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  id: string | null;
  onClose: () => void;
};

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
  description: string;
  // ...
  participating?: boolean;
}

export default function EventModal({ id, onClose }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ...
  const [participating, setPariticpating] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
    fetch(`${base}/events/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEvent(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError((err && err.message) || "Failed to load event");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [id, onClose]);

  const onToogleParticipate = async () => {
    try {
      // Exemplo de chamada (ajuste para o seu endpoint quando disponível):
      // const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
      // const token = localStorage.getItem("access"); // ou de onde você guardar
      // await fetch(`${base}/events/${id}/${participating ? "unparticipate" : "participate"}/`, {
      //   method: "POST",
      //   headers: token ? { Authorization: `JWT ${token}` } : {},
      // });
      setPariticpating((v) => !v);
    } catch (e) {
      console.error(e);
    }
  };

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-lg w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">Event details</h3>
          <button
            aria-label="Close modal"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 min-h-[120px]">
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
          {!loading && !error && event && (
            <div>
              <p>
                <strong>Name:</strong>{" "}
                <span className="font-normal">{event.name}</span>
              </p>
              {event.date && (
                <p className="mt-2">
                  <strong>Date:</strong>{" "}
                  <span className="font-normal">
                    {new Date(event.date).toLocaleString()}
                  </span>
                </p>
              )}
              {event.location && (
                <p className="mt-2">
                  <strong>Location:</strong>{" "}
                  <span className="font-normal">{event.location}</span>
                </p>
              )}
              {event.description && (
                <div className="mt-2">
                  <strong>Description:</strong>
                  <div className="mt-1 whitespace-pre-wrap font-normal">
                    {event.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-start gap-4">
          <Link href="">
            <Button>Edit</Button>
          </Link>

          <Link href="">
            <Button>Cancel</Button>
          </Link>
        </div>

        <div className="mt-6 flex justify-start gap-4">
          <Link href="">
            <Button
              onClick={onToogleParticipate}
              variant={participating ? "destructive" : "default"}
              aria-pressed={participating}
            >
              {participating ? "Cancel participation" : "Participate "}
            </Button>
          </Link>

          <Link href="">
            <Button>Interested</Button>
          </Link>
        </div>

        <div className="mt-6 flex justify-start gap-4">
          <Link href="/profile/login">
            <Button>Login</Button>
          </Link>
        </div>

        <div className="mt-6 text-right">
          <Button className="px-3 py-1 rounded border" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

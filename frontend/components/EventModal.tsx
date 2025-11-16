"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  id: string | null;
  onClose: () => void;
  showLogin?: boolean;
  showStudentActions?: boolean;
  showOrganizerActions?: boolean;
};

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
  description: string;
}

export default function EventModal({
  id,
  onClose,
  showLogin = false,
  showStudentActions = false,
  showOrganizerActions = false,
}: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full mx-4 p-10 relative shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close modal"
          onClick={onClose}
          className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 text-3xl leading-none"
        >
          ×
        </button>

        <div className="pr-8">
          {loading && <p className="text-lg">Loading...</p>}
          {error && <p className="text-red-600 text-lg">Error: {error}</p>}
          {!loading && !error && event && (
            <>
              <h2 className="text-3xl font-bold mb-8">{event.name}</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Date
                  </label>
                  <div className="text-base text-gray-800">
                    {event.date
                      ? new Date(event.date).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"}
                  </div>
                </div>

                {event.location && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="text-base text-gray-800">
                      {event.location}
                    </div>
                  </div>
                )}

                {event.description && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {event.description}
                    </div>
                  </div>
                )}
              </div>

              {showLogin && (
                <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                  <Link href="" className="flex-1">
                    <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl">
                      Login
                    </Button>
                  </Link>
                </div>
              )}

              {showStudentActions && (
                <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                  <Link href="" className="flex-1">
                    <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl">
                      Participate
                    </Button>
                  </Link>
                  <Link href="" className="flex-1">
                    <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl">
                      Interested
                    </Button>
                  </Link>
                </div>
              )}

              {showOrganizerActions && (
                <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                  <Link href="" className="flex-1">
                    <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl">
                      Edit
                    </Button>
                  </Link>
                  <Link href="" className="flex-1">
                    <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl">
                      Cancel
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

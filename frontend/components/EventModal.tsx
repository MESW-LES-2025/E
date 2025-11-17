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
  organizer: number | null; // The organizer ID
  organizer_name: string | null; // The organizer's name
  status: string;
}

export default function EventModal({ id, onClose }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  const [isAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_tokens") !== null;
    }
    return false;
  });

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
              <h2
                className={`text-3xl font-bold ${event.status ? "mb-2" : "mb-8"}`}
              >
                {event.name}
              </h2>
              {event.status && (
                <div className="mb-8">
                  <span
                    className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${
                      event.status === "Active" ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              )}

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

                {event.organizer_name && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Organizer
                    </label>
                    <div className="text-base text-gray-800">
                      {event.organizer_name}
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

              {isAuthenticated && (
                <div className="border-t border-gray-200 mt-6 pt-6">
                  <button
                    onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
                    className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-800 hover:text-gray-900"
                    aria-expanded={isParticipantsOpen}
                  >
                    <span>Participants</span>
                    <span
                      className={`transform transition-transform duration-200 ${
                        isParticipantsOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {isParticipantsOpen && (
                    <div className="mt-4 text-gray-700">
                      Participant list goes here...
                    </div>
                  )}
                </div>
              )}

              {!isAuthenticated ? (
                // If user is not logged in, show only the Login button
                <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                  <Link href="/profile/login" className="flex-1">
                    <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl">
                      Login
                    </Button>
                  </Link>
                </div>
              ) : (
                // If user is logged in, show other action buttons.
                // NOTE: This section can be customized to show different buttons
                // for organizers vs. other users by using the AuthContext.
                <>
                  <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                    <Link href="" className="flex-1">
                      <Button className="w-full bg-gray-800 hover:bg-gray-500 text-white font-bold py-4 rounded-xl">
                        Participate
                      </Button>
                    </Link>
                    <Link href="" className="flex-1">
                      <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl">
                        Interested
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                    <Link href="" className="flex-1">
                      <Button className="w-full bg-gray-800 hover:bg-gray-500 text-white font-bold py-4 rounded-xl">
                        Edit
                      </Button>
                    </Link>
                    <Link href="" className="flex-1">
                      <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl">
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

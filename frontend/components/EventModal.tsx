"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cancelEventRequest, uncancelEventRequest } from "@/lib/events";

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
  organizer: number;
  organizer_name: string;
  status: string;
  participant_count: number;
  is_participating: boolean;
  capacity: number | null;
  is_full: boolean;
  category: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  SOCIAL: "bg-blue-500 text-white",
  ACADEMIC: "bg-green-500 text-white",
  TRAVEL: "bg-yellow-500 text-black",
  SPORTS: "bg-red-500 text-white",
  CULTURAL: "bg-purple-500 text-white",
  VOLUNTEERING: "bg-teal-500 text-white",
  NIGHTLIFE: "bg-pink-500 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-500 text-white",
  Cancelled: "bg-red-500 text-white",
};

export default function EventModal({ id, onClose }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const tokens = localStorage.getItem("auth_tokens");
      if (!tokens) return false;
      const parsed = JSON.parse(tokens);
      return !!parsed.access;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

    const fetchEvent = async () => {
      try {
        let res;
        if (isAuthenticated) {
          try {
            res = await fetchWithAuth(`${base}/events/${id}/`);
            // if 401/403, expired token
            if (res.status === 401 || res.status === 403) {
              // remove invalid token
              localStorage.removeItem("auth_tokens");
              setIsAuthenticated(false);
              // try public fetch
              res = await fetch(`${base}/events/${id}/`);
            }
          } catch {
            // if error, removes token and try public fetch
            localStorage.removeItem("auth_tokens");
            setIsAuthenticated(false);
            res = await fetch(`${base}/events/${id}/`);
          }
        } else {
          res = await fetch(`${base}/events/${id}/`);
        }

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!cancelled) setEvent(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load event");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvent();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [id, onClose, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
      fetchWithAuth(`${base}/auth/users/me/`)
        .then((res) => {
          if (!res.ok) {
            // Invalid token
            if (res.status === 401 || res.status === 403) {
              localStorage.removeItem("auth_tokens");
              setIsAuthenticated(false);
            }
            throw new Error(`Status ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setUser(data);
        })
        .catch(() => {
          // silently fail
        });
    }
  }, [isAuthenticated]);

  const toggleParticipation = async () => {
    if (!event) return;
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
    const method = event.is_participating ? "DELETE" : "POST";
    try {
      const res = await fetchWithAuth(
        `${base}/events/${event.id}/participate/`,
        { method },
      );
      const data = await res.json();
      if (res.ok) {
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                participant_count: data.participant_count,
                is_participating: data.is_participating,
                is_full: data.is_full,
              }
            : prev,
        );
      }
    } catch {
      // Silently fail
    }
  };

  if (!id) return null;

  const handleCancel = async () => {
    if (!event) return;

    if (!window.confirm("Are you sure you want to cancel this event?")) return;

    try {
      const res = await cancelEventRequest(event.id);
      if (!res.ok) throw new Error("Failed to cancel event");

      const updated = await res.json();
      setEvent(updated);
    } catch {
      alert("Could not cancel event");
    }
  };

  const handleUncancel = async () => {
    if (!event) return;

    if (!window.confirm("Do you want to reactivate this event?")) return;

    try {
      const res = await uncancelEventRequest(event.id);
      if (!res.ok) throw new Error("Failed to reactivate the event");

      const updated = await res.json();
      setEvent(updated);
    } catch {
      alert("Could not reactivate the event");
    }
  };

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
              <div className="flex items-center gap-2 mb-8">
                {event.category && (
                  <Badge
                    className={
                      CATEGORY_COLORS[event.category] ||
                      "bg-gray-500 text-white"
                    }
                  >
                    {event.category}
                  </Badge>
                )}
                {event.status && (
                  <Badge
                    className={
                      STATUS_COLORS[event.status] || "bg-gray-500 text-white"
                    }
                  >
                    {event.status}
                  </Badge>
                )}
              </div>

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

              {user?.role === "ORGANIZER" && user.id === event.organizer && (
                <div className="border-t border-gray-200 mt-6 pt-6">
                  <button
                    onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
                    className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-800 hover:text-gray-900"
                    aria-expanded={isParticipantsOpen}
                  >
                    <span>Participants</span>
                    <span
                      className={`transform transition-transform duration-200 ${isParticipantsOpen ? "rotate-180" : ""}`}
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
                <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                  <Link href="/profile/login" className="flex-1">
                    <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl">
                      Login
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {user?.role === "ATTENDEE" && event.status !== "Canceled" && (
                    <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">
                          Participants: {event?.participant_count}
                          {event?.capacity !== null &&
                            event?.capacity !== undefined &&
                            event?.capacity > 0 && (
                              <span>/{event.capacity}</span>
                            )}
                          {(event?.capacity === null ||
                            event?.capacity === 0) && <span> (Unlimited)</span>}
                        </span>
                        {event?.is_full && (
                          <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                            Event Full
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <Button
                          onClick={toggleParticipation}
                          disabled={event?.is_full && !event?.is_participating}
                          className={
                            "flex-1 font-bold py-4 rounded-xl " +
                            (event?.is_participating
                              ? "bg-red-600 hover:bg-red-500 text-white"
                              : event?.is_full
                                ? "bg-gray-400 cursor-not-allowed text-white"
                                : "bg-gray-800 hover:bg-gray-600 text-white")
                          }
                        >
                          {event?.is_participating
                            ? "Cancel Participation"
                            : event?.is_full
                              ? "Event Full"
                              : "Participate"}
                        </Button>
                        <Button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl">
                          Interested
                        </Button>
                      </div>
                    </div>
                  )}
                  {user?.role === "ORGANIZER" &&
                    user.id === event.organizer && (
                      <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                        <Link
                          href={`/events/edit/${event.id}`}
                          className="flex-1"
                        >
                          <Button className="w-full bg-gray-800 hover:bg-gray-500 text-white font-bold py-4 rounded-xl">
                            Edit
                          </Button>
                        </Link>
                        {event.status === "Canceled" ? (
                          <Button
                            onClick={handleUncancel}
                            className="flex-1 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl"
                          >
                            Reactivate Event
                          </Button>
                        ) : (
                          <Button
                            onClick={handleCancel}
                            className="flex-1 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl"
                          >
                            Cancel Event
                          </Button>
                        )}
                      </div>
                    )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

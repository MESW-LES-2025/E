import { fetchWithAuth } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function cancelEventRequest(eventId: number) {
  return fetchWithAuth(`${API_BASE}/events/${eventId}/cancel/`, {
    method: "POST",
  });
}

export async function uncancelEventRequest(eventId: number) {
  return fetchWithAuth(`${API_BASE}/events/${eventId}/uncancel/`, {
    method: "POST",
  });
}

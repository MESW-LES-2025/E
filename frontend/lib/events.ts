import { fetchWithAuth } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export interface Event {
  id: number;
  name: string;
  date: string;
  status: string;
  location?: string;
  description?: string;
  capacity?: number;
  participant_count?: number;
  interest_count?: number;
  is_participating?: boolean;
  is_interested?: boolean;
  organizer_name?: string;
  created_by?: string;
  organization_id?: number;
  organization_name?: string;
  category: string;
}

interface Participant {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

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

export async function getMyOrganizedEvents(): Promise<Event[]> {
  const response = await fetchWithAuth(`${API_BASE}/events/my-organized/`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to fetch organized events");
  }

  const data = await response.json();
  return data.results || data;
}

export async function getEventParticipants(
  eventId: number,
): Promise<Participant[]> {
  const response = await fetchWithAuth(
    `${API_BASE}/events/${eventId}/participants/`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to fetch event participants");
  }

  const data = await response.json();
  return data.results || data;
}

export async function markEventAsInterested(
  eventId: number,
): Promise<{ interest_count: number; is_interested: boolean }> {
  const response = await fetchWithAuth(
    `${API_BASE}/events/${eventId}/interested/`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to mark event as interested");
  }

  return response.json();
}

export async function unmarkEventAsInterested(
  eventId: number,
): Promise<{ interest_count: number; is_interested: boolean }> {
  const response = await fetchWithAuth(
    `${API_BASE}/events/${eventId}/interested/`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to unmark event as interested");
  }

  return response.json();
}

export async function getInterestedEvents(): Promise<Event[]> {
  const response = await fetchWithAuth(`${API_BASE}/events/interested/`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to fetch interested events");
  }

  const data = await response.json();
  return data.results || data;
}

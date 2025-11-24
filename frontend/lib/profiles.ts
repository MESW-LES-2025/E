import { fetchWithAuth } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export type ProfileRole = "ATTENDEE" | "ORGANIZER" | "ADMIN";

export interface Profile {
  id: number;
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: ProfileRole;
  phone_number: string;
  bio: string;
  participating_events: number[];
}

export interface UpdateProfilePayload {
  phone_number?: string;
  bio?: string;
}

export async function getProfile(): Promise<Profile> {
  const response = await fetchWithAuth(`${API_BASE}/accounts/profile/me/`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMessage = error?.detail || "Failed to fetch profile";

    // If it's an authentication error, provide a clearer message
    if (response.status === 401 || response.status === 403) {
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<Profile> {
  const response = await fetchWithAuth(`${API_BASE}/accounts/profile/me/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to update profile");
  }

  return response.json();
}

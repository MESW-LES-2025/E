import { fetchWithAuth } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export type OrganizationType =
  | "COMPANY"
  | "NON_PROFIT"
  | "COMMUNITY"
  | "EDUCATIONAL"
  | "GOVERNMENT"
  | "OTHER";

// Public organization (what non-owners see)
export interface PublicOrganization {
  id: number;
  name: string;
  description: string;
  email: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  logo_url: string | null;
  cover_image_url: string | null;
  twitter_handle: string;
  facebook_url: string;
  linkedin_url: string;
  instagram_handle: string;
  organization_type: OrganizationType | null;
  established_date: string | null;
  owner_name: string;
  event_count: number;
  created_at: string;
}

// Full organization (what owners see)
export interface Organization extends PublicOrganization {
  owner_id: number;
  updated_at: string;
}

export interface CreateOrganizationPayload {
  name: string;
  description?: string;
  email?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string;
  cover_image_url?: string;
  twitter_handle?: string;
  facebook_url?: string;
  linkedin_url?: string;
  instagram_handle?: string;
  organization_type?: OrganizationType;
  established_date?: string;
}

export type UpdateOrganizationPayload = Partial<CreateOrganizationPayload>;

export interface OrganizationEvent {
  id: number;
  name: string;
  date: string;
  location?: string;
  description?: string;
  status: string;
  capacity?: number;
  participants?: number[];
}

// List all organizations (public endpoint, no auth required)
export async function listOrganizations(): Promise<PublicOrganization[]> {
  const response = await fetch(`${API_BASE}/accounts/organizations/`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to fetch organizations");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
}

// Get organization by ID (public endpoint, but returns different data for owners)
export async function getOrganization(
  id: number,
): Promise<Organization | PublicOrganization> {
  const response = await fetchWithAuth(
    `${API_BASE}/accounts/organizations/${id}/`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to fetch organization");
  }

  return response.json();
}

// Create organization (requires ORGANIZER role)
export async function createOrganization(
  payload: CreateOrganizationPayload,
): Promise<Organization> {
  const response = await fetchWithAuth(`${API_BASE}/accounts/organizations/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    // Provide more specific error messages
    if (response.status === 403) {
      throw new Error(
        error?.detail ||
          "You don't have permission to create organizations. Only users with ORGANIZER role can create organizations.",
      );
    }

    // Handle validation errors
    if (response.status === 400 && error) {
      throw error; // Throw the full error object for field-level validation
    }

    throw new Error(error?.detail || "Failed to create organization");
  }

  return response.json();
}

// Update organization (owner only)
export async function updateOrganization(
  id: number,
  payload: UpdateOrganizationPayload,
): Promise<Organization> {
  const response = await fetchWithAuth(
    `${API_BASE}/accounts/organizations/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to update organization");
  }

  return response.json();
}

// Delete organization (owner only)
export async function deleteOrganization(id: number): Promise<void> {
  const response = await fetchWithAuth(
    `${API_BASE}/accounts/organizations/${id}/`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to delete organization");
  }
}

// Get organization events (public endpoint)
export async function getOrganizationEvents(
  id: number,
): Promise<OrganizationEvent[]> {
  const response = await fetch(
    `${API_BASE}/accounts/organizations/${id}/events/`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to fetch organization events");
  }

  return response.json();
}

// Get organizations owned by current user (requires auth)
export async function getMyOrganizations(): Promise<Organization[]> {
  const response = await fetchWithAuth(
    `${API_BASE}/accounts/organizations/me/`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || "Failed to fetch my organizations");
  }

  return response.json();
}

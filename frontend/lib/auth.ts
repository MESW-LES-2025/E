const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const storageKey = "auth_tokens";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(storageKey);
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey);
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || "Invalid credentials");
  }
  const data = await res.json();
  if (typeof window !== "undefined") {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ access: data.access, refresh: data.refresh }),
    );
  }
}

export type RegisterRole = "ATTENDEE" | "ORGANIZER";

export interface RegisterPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: RegisterRole;
}

type RegisterErrorResponse = {
  detail?: string;
  [field: string]: string[] | string | undefined;
};

export async function register(payload: RegisterPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/users/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: RegisterErrorResponse = {};
  try {
    data = (await res.json()) as RegisterErrorResponse;
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw data;
  }
}

async function refreshToken(): Promise<string | null> {
  const authTokens = localStorage.getItem("auth_tokens");
  if (!authTokens) return null;

  try {
    const tokens = JSON.parse(authTokens);
    if (!tokens.refresh) return null;

    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (!res.ok) {
      // Refresh token is invalid, clear storage
      localStorage.removeItem("auth_tokens");
      return null;
    }

    const data = await res.json();
    const newTokens = { access: data.access, refresh: tokens.refresh };
    localStorage.setItem("auth_tokens", JSON.stringify(newTokens));
    return data.access;
  } catch (error) {
    console.error("Error refreshing token:", error);
    localStorage.removeItem("auth_tokens");
    return null;
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const authTokens = localStorage.getItem("auth_tokens");
  let token = null;

  if (authTokens) {
    try {
      const tokens = JSON.parse(authTokens);
      token = tokens.access;
    } catch (error) {
      console.error("Error parsing auth tokens:", error);
    }
  }

  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.headers) {
    const customHeaders = new Headers(options.headers);
    customHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401/403 and have a refresh token, try to refresh
  if ((response.status === 401 || response.status === 403) && authTokens) {
    const newToken = await refreshToken();
    if (newToken) {
      // Retry the request with the new token
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed, user needs to log in again
      // Clear auth state
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_tokens");
      }
      // Return a response that indicates authentication failed
      return new Response(
        JSON.stringify({ detail: "Session expired. Please log in again." }),
        {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return response;
}

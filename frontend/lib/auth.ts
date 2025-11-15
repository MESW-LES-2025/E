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
    throw new Error(err?.detail || "Credenciais inválidas");
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

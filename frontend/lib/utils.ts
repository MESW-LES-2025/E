import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAuthToken } from "./auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  headers: HeadersInit = {},
): Promise<Response> {
  const token = await getAuthToken();

  const requestHeaders: HeadersInit = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${endpoint}`, {
    method,
    headers: requestHeaders,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

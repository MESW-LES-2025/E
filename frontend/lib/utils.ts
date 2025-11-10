import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAuthToken } from "./auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchWithHeaders(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAuthToken()}`,
    },
  });
}

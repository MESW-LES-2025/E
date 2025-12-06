import { fetchWithAuth } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export async function getUnreadCount(): Promise<number> {
  const res = await fetchWithAuth(`${API_BASE}/notifications/unread-count/`, {
    method: "GET",
  });
  if (!res.ok) throw new Error("Failed to fetch unread count");
  const data = await res.json();
  return data.unread ?? 0;
}

export async function listNotifications(): Promise<NotificationItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/notifications/`, {
    method: "GET",
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function markAsRead(id: number): Promise<void> {
  const res = await fetchWithAuth(
    `${API_BASE}/notifications/${id}/mark-as-read/`,
    {
      method: "POST",
    },
  );
  if (!res.ok) throw new Error("Failed to mark as read");
}

export async function markAsUnread(id: number): Promise<void> {
  const res = await fetchWithAuth(
    `${API_BASE}/notifications/${id}/mark-as-unread/`,
    {
      method: "POST",
    },
  );
  if (!res.ok) throw new Error("Failed to mark as unread");
}

export async function markAllAsRead(): Promise<number> {
  const res = await fetchWithAuth(
    `${API_BASE}/notifications/mark-all-as-read/`,
    {
      method: "POST",
    },
  );
  if (!res.ok) throw new Error("Failed to mark all as read");
  const data = await res.json();
  return data.updated ?? 0;
}

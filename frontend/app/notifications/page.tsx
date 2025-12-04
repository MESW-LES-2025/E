"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  NotificationItem,
} from "@/lib/notifications";
import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listNotifications();
      setItems(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRead = async (id: number, nextRead: boolean) => {
    try {
      setSaving(true);
      if (nextRead) {
        await markAsRead(id);
      } else {
        await markAsUnread(id);
      }
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: nextRead } : n)),
      );
    } catch (e) {
      console.error(e);
      setError("Failed to update notification");
    } finally {
      setSaving(false);
    }
  };

  const onMarkAll = async () => {
    try {
      setSaving(true);
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
      setError("Failed to mark all as read");
    } finally {
      setSaving(false);
    }
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button
          variant="outline"
          disabled={saving || unreadCount === 0}
          onClick={onMarkAll}
        >
          Mark all as read
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">Loading...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No notifications.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`border rounded p-4 flex items-start gap-3 ${
                n.is_read ? "bg-white" : "bg-yellow-50"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={n.is_read}
                onChange={(e) => toggleRead(n.id, e.target.checked)}
                aria-label={n.is_read ? "Mark as unread" : "Mark as read"}
                disabled={saving}
              />
              <div className="flex-1">
                <div className="flex justify-between">
                  <h2
                    className={`font-semibold ${n.is_read ? "" : "text-yellow-900"}`}
                  >
                    {n.title}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                {n.message && <p className="mt-2 text-sm">{n.message}</p>}
                <div className="mt-2">
                  {n.is_read ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => toggleRead(n.id, false)}
                      disabled={saving}
                    >
                      Mark as unread
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => toggleRead(n.id, true)}
                      disabled={saving}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

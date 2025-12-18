"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  NotificationItem,
  onNotificationReceivedCallback,
} from "@/lib/notifications";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  useEffect(() => {
    const storedPreference = localStorage.getItem("remindersEnabled");
    if (storedPreference !== null) {
      setRemindersEnabled(JSON.parse(storedPreference));
    }
  }, []);

  const handleReminderToggle = (enabled: boolean) => {
    setRemindersEnabled(enabled);
    localStorage.setItem("remindersEnabled", JSON.stringify(enabled));
    if (onNotificationReceivedCallback) {
      onNotificationReceivedCallback();
    }
  };

  const load = async (remindersAllowed: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const data = await listNotifications();
      const filteredData = remindersAllowed
        ? data
        : data.filter((item) => item.title !== "Event Reminder");
      setItems(filteredData);
    } catch (e) {
      console.error(e);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(remindersEnabled);
  }, [remindersEnabled]);

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

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Notification Preferences</h2>
        <div className="flex items-center space-x-2">
          <Switch
            id="reminders-enabled"
            checked={remindersEnabled}
            onCheckedChange={handleReminderToggle}
          />
          <Label htmlFor="reminders-enabled">
            Enable Upcoming Event Reminders
          </Label>
        </div>
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

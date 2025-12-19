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
  const [mounted, setMounted] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [eventChangesEnabled, setEventChangesEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Load preferences from localStorage after mount (client-side only)
    const storedPreference = localStorage.getItem("remindersEnabled");
    if (storedPreference !== null) {
      setRemindersEnabled(JSON.parse(storedPreference));
    }
    const storedEventChangesPreference = localStorage.getItem(
      "eventChangesEnabled",
    );
    if (storedEventChangesPreference !== null) {
      setEventChangesEnabled(JSON.parse(storedEventChangesPreference));
    }
  }, []);

  const handleReminderToggle = (enabled: boolean) => {
    setRemindersEnabled(enabled);
    if (mounted) {
      localStorage.setItem("remindersEnabled", JSON.stringify(enabled));
    }
    if (onNotificationReceivedCallback) {
      onNotificationReceivedCallback();
    }
  };

  const handleEventChangesToggle = (enabled: boolean) => {
    setEventChangesEnabled(enabled);
    if (mounted) {
      localStorage.setItem("eventChangesEnabled", JSON.stringify(enabled));
    }
    if (onNotificationReceivedCallback) {
      onNotificationReceivedCallback();
    }
  };

  const load = async (
    remindersAllowed: boolean,
    eventChangesAllowed: boolean,
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data = await listNotifications();
      let filteredData = data;
      if (!remindersAllowed) {
        filteredData = filteredData.filter(
          (item) => item.title !== "Event Reminder",
        );
      }
      if (!eventChangesAllowed) {
        filteredData = filteredData.filter(
          (item) =>
            !item.title.startsWith("Event Updated:") &&
            !item.title.startsWith("Event Cancelled:"),
        );
      }
      setItems(filteredData);
    } catch (e) {
      console.error(e);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(remindersEnabled, eventChangesEnabled);
  }, [remindersEnabled, eventChangesEnabled]);

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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your events and activities
          </p>
        </div>
        <Button
          variant="outline"
          disabled={saving || unreadCount === 0}
          onClick={onMarkAll}
        >
          Mark all as read
        </Button>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-4">Notification Preferences</h2>
          <div className="space-y-4">
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
            <div className="flex items-center space-x-2">
              <Switch
                id="event-changes-enabled"
                checked={eventChangesEnabled}
                onCheckedChange={handleEventChangesToggle}
              />
              <Label htmlFor="event-changes-enabled">
                Enable Event Change Notifications
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <div className="space-y-3">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`border-2 transition-all ${
                n.is_read
                  ? "bg-card border-border"
                  : "bg-primary/5 border-primary/30 shadow-sm"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={n.is_read}
                    onChange={(e) => toggleRead(n.id, e.target.checked)}
                    aria-label={n.is_read ? "Mark as unread" : "Mark as read"}
                    disabled={saving}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-4">
                      <h2
                        className={`font-semibold text-lg ${
                          n.is_read ? "text-foreground" : "text-primary"
                        }`}
                      >
                        {n.title}
                      </h2>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    {n.message && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {n.message}
                      </p>
                    )}
                    <div className="mt-3">
                      {n.is_read ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRead(n.id, false)}
                          disabled={saving}
                        >
                          Mark as unread
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => toggleRead(n.id, true)}
                          disabled={saving}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

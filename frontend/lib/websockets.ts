import { toast } from "sonner";
import { onNotificationReceivedCallback } from "./notifications";

const WEBSOCKET_URL = "ws://localhost:8000/ws/notifications/";

let socket: WebSocket | null = null;

type EventReminderMsg = {
  type: "event_reminder";
  event_name?: string;
  time_left?: string;
  start_time?: string;
};

type NewEventMsg = {
  type: "new_event";
  organization_name?: string;
  event_name?: string;
  start_time?: string;
};

type EventUpdatedMsg = {
  type: "event_updated";
  event_id?: number;
  event_name?: string;
  change_type?: string;
  old_value?: string;
  new_value?: string;
  message?: string;
};

type EventCancelledMsg = {
  type: "event_cancelled";
  event_id?: number;
  event_name?: string;
  message?: string;
};

type SendNotificationEnvelope = {
  type?: string; // "send_notification" from backend
  message?:
    | EventReminderMsg
    | NewEventMsg
    | EventUpdatedMsg
    | EventCancelledMsg;
};

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isEventReminder(x: unknown): x is EventReminderMsg {
  return isObject(x) && x["type"] === "event_reminder";
}
function isNewEvent(x: unknown): x is NewEventMsg {
  return isObject(x) && x["type"] === "new_event";
}
function isEventUpdated(x: unknown): x is EventUpdatedMsg {
  return isObject(x) && x["type"] === "event_updated";
}
function isEventCancelled(x: unknown): x is EventCancelledMsg {
  return isObject(x) && x["type"] === "event_cancelled";
}

export const connectWebSocket = (userId: string) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  socket = new WebSocket(`${WEBSOCKET_URL}${userId}/`);

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onmessage = (event) => {
    // Defensive parse
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(event.data as string);
    } catch {
      console.warn("[ws] non-JSON message received", event.data);
    }

    // Normalize payload:
    const msg =
      isObject(parsed) && "message" in parsed
        ? (parsed as SendNotificationEnvelope).message
        : parsed;

    if (isEventReminder(msg)) {
      // Gate only event_reminder by local preference
      const remindersEnabled = localStorage.getItem("remindersEnabled");
      const remindersAllowed =
        remindersEnabled === null ||
        (remindersEnabled === "true" || remindersEnabled === "false"
          ? JSON.parse(remindersEnabled)
          : true);

      if (remindersAllowed) {
        const name = msg.event_name ?? "Event";
        const left = msg.time_left ?? "";
        toast.info(`Event Reminder: ${name} is in ${left}.`);
      }
      console.debug("[ws] message type:", msg.type, msg);
    } else if (isNewEvent(msg)) {
      // Always show new event notifications
      const org = msg.organization_name ?? "Organization";
      const name = msg.event_name ?? "New Event";
      toast.info(`New Event: ${org} published "${name}".`);
      console.debug("[ws] message type:", msg.type, msg);
    } else if (isEventUpdated(msg)) {
      // Show event update notifications
      const name = msg.event_name ?? "Event";
      const changeMsg = msg.message ?? "Event details have been updated";
      toast.info(`Event Updated: ${name} - ${changeMsg}`, {
        action: msg.event_id
          ? {
              label: "View Event",
              onClick: () => {
                // Navigate to event page - using window.location for simplicity
                // Could be enhanced to use Next.js router if available in context
                window.location.href = `/event?id=${msg.event_id}`;
              },
            }
          : undefined,
      });
      console.debug("[ws] message type:", msg.type, msg);
    } else if (isEventCancelled(msg)) {
      // Show event cancellation notifications
      const name = msg.event_name ?? "Event";
      const cancelMsg = msg.message ?? "This event has been cancelled";
      toast.warning(`Event Cancelled: ${name} - ${cancelMsg}`, {
        action: msg.event_id
          ? {
              label: "View Event",
              onClick: () => {
                window.location.href = `/event?id=${msg.event_id}`;
              },
            }
          : undefined,
      });
      console.debug("[ws] message type:", msg.type, msg);
    } else if (msg !== null && msg !== undefined) {
      console.debug("[ws] message (unrecognized payload):", msg);
    }

    if (onNotificationReceivedCallback) {
      onNotificationReceivedCallback();
    }
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected");
    socket = null;
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    socket = null;
  };
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.close();
  }
};

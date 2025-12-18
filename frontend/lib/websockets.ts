import { toast } from "sonner";
import { onNotificationReceivedCallback } from "./notifications";

const WEBSOCKET_URL = "ws://localhost:8000/ws/notifications/";

let socket: WebSocket | null = null;

export const connectWebSocket = (userId: string) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  socket = new WebSocket(`${WEBSOCKET_URL}${userId}/`);

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onmessage = (event) => {
    const remindersEnabled = localStorage.getItem("remindersEnabled");
    if (remindersEnabled === null || JSON.parse(remindersEnabled)) {
      const data = JSON.parse(event.data);
      if (data.type === "event_reminder") {
        toast.info(
          `Event Reminder: ${data.event_name} is in ${data.time_left}.`,
        );
      }
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

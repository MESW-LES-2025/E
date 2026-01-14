import { connectWebSocket, disconnectWebSocket } from "@/lib/websockets";
import { toast } from "sonner";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    info: jest.fn(),
  },
}));

interface MockWebSocket {
  send: jest.Mock;
  close: jest.Mock;
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

describe("WebSocket Notifications", () => {
  let mockWebSocket: MockWebSocket;
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = global.WebSocket;

    // Mock WebSocket implementation
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(function (this: MockWebSocket) {
        if (this.onclose) {
          this.onclose();
        }
      }),
      readyState: 1, // OPEN
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    global.WebSocket = jest.fn(
      () => mockWebSocket,
    ) as unknown as typeof WebSocket;
    (global.WebSocket as unknown as { OPEN: number }).OPEN = 1;

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    disconnectWebSocket();
  });

  it("should connect to WebSocket with correct URL", () => {
    const userId = "123";
    connectWebSocket(userId);

    expect(global.WebSocket).toHaveBeenCalledWith(
      `ws://localhost:8000/ws/notifications/${userId}/`,
    );
  });

  it("should show toast notification for event_reminder", () => {
    connectWebSocket("123");

    // Default: localStorage returns null -> reminders enabled
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    const messageEvent = {
      data: JSON.stringify({
        type: "event_reminder",
        event_name: "Test Event",
        time_left: "1 hour",
      }),
    };

    // Simulate incoming message
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage(messageEvent);
    }

    expect(toast.info).toHaveBeenCalledWith(
      "Event Reminder: Test Event is in 1 hour.",
    );
  });

  it("should NOT show notification when reminders are disabled in localStorage", () => {
    connectWebSocket("123");

    // Simulate reminders disabled
    (window.localStorage.getItem as jest.Mock).mockReturnValue("false");

    const messageEvent = {
      data: JSON.stringify({
        type: "event_reminder",
        event_name: "Test Event",
        time_left: "1 hour",
      }),
    };

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage(messageEvent);
    }

    expect(toast.info).not.toHaveBeenCalled();
  });

  it("should show notification when reminders are explicitly enabled in localStorage", () => {
    connectWebSocket("123");

    // Simulate reminders enabled
    (window.localStorage.getItem as jest.Mock).mockReturnValue("true");

    const messageEvent = {
      data: JSON.stringify({
        type: "event_reminder",
        event_name: "Test Event",
        time_left: "1 hour",
      }),
    };

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage(messageEvent);
    }

    expect(toast.info).toHaveBeenCalled();
  });

  it("should ignore messages with different types", () => {
    connectWebSocket("123");
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    const messageEvent = {
      data: JSON.stringify({
        type: "chat_message",
        text: "Hello",
      }),
    };

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage(messageEvent);
    }

    expect(toast.info).not.toHaveBeenCalled();
  });
});

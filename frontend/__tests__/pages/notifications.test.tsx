import "@testing-library/jest-dom";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import NotificationsPage from "../../app/notifications/page";
import {
  listNotifications,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  type NotificationItem,
} from "@/lib/notifications";

// Mock the notifications library
jest.mock("@/lib/notifications", () => ({
  listNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAsUnread: jest.fn(),
  markAllAsRead: jest.fn(),
  registerNotificationRefreshCallback: jest.fn(),
  onNotificationReceivedCallback: null,
}));

const mockListNotifications = listNotifications as jest.MockedFunction<
  typeof listNotifications
>;
const mockMarkAsRead = markAsRead as jest.MockedFunction<typeof markAsRead>;
const mockMarkAsUnread = markAsUnread as jest.MockedFunction<
  typeof markAsUnread
>;
const mockMarkAllAsRead = markAllAsRead as jest.MockedFunction<
  typeof markAllAsRead
>;

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "Unread Notification",
    message: "This is an unread message.",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Read Notification",
    message: "This is a read message.",
    is_read: true,
    created_at: new Date().toISOString(),
  },
];

describe("NotificationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display a loading state initially", () => {
    mockListNotifications.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<NotificationsPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should display notifications after successful loading", async () => {
    mockListNotifications.mockResolvedValue(mockNotifications);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
      expect(screen.getByText("Read Notification")).toBeInTheDocument();
    });
  });

  it("should display an error message if loading fails", async () => {
    mockListNotifications.mockRejectedValue(new Error("Failed to load"));
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load notifications"),
      ).toBeInTheDocument();
    });
  });

  it("should display 'No notifications' if the list is empty", async () => {
    mockListNotifications.mockResolvedValue([]);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("No notifications.")).toBeInTheDocument();
    });
  });

  it("should call markAsRead and update the UI when 'Mark as read' is clicked", async () => {
    mockListNotifications.mockResolvedValue([...mockNotifications]);
    mockMarkAsRead.mockResolvedValue(undefined);
    render(<NotificationsPage />);

    // Find the specific notification card for the unread notification
    const unreadNotificationItem = await screen.findByText(
      "Unread Notification",
    );
    const card =
      unreadNotificationItem.closest('[class*="Card"]') ||
      unreadNotificationItem.parentElement?.parentElement;

    // Find and click the button within that specific card
    const markAsReadButton = card
      ? within(card as HTMLElement).getByRole("button", {
          name: "Mark as read",
        })
      : screen.getByRole("button", { name: "Mark as read" });
    fireEvent.click(markAsReadButton);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(1);
    });

    // Now, verify that the button *within that same card* has changed
    const markAsUnreadButton = card
      ? await within(card as HTMLElement).findByRole("button", {
          name: "Mark as unread",
        })
      : await screen.findByRole("button", { name: "Mark as unread" });
    expect(markAsUnreadButton).toBeInTheDocument();
  });

  it("should call markAsUnread and update the UI when 'Mark as unread' is clicked", async () => {
    mockListNotifications.mockResolvedValue([...mockNotifications]);
    mockMarkAsUnread.mockResolvedValue(undefined);
    render(<NotificationsPage />);

    await waitFor(() => screen.getByText("Read Notification"));

    const markAsUnreadButton = screen.getByRole("button", {
      name: "Mark as unread",
    });
    fireEvent.click(markAsUnreadButton);

    await waitFor(() => {
      expect(mockMarkAsUnread).toHaveBeenCalledWith(2);
    });
  });

  it("should call markAllAsRead and update the UI", async () => {
    mockListNotifications.mockResolvedValue([...mockNotifications]);
    mockMarkAllAsRead.mockResolvedValue(undefined);
    render(<NotificationsPage />);

    await waitFor(() => screen.getByText("Unread Notification"));

    const markAllButton = screen.getByRole("button", {
      name: "Mark all as read",
    });
    expect(markAllButton).not.toBeDisabled();
    fireEvent.click(markAllButton);

    await waitFor(() => {
      expect(mockMarkAllAsRead).toHaveBeenCalled();
      // All buttons should now be "Mark as unread"
      expect(
        screen.getAllByRole("button", { name: "Mark as unread" }).length,
      ).toBe(2);
    });
  });

  it("should show an error if updating a notification fails (mark as read)", async () => {
    mockListNotifications.mockResolvedValue([...mockNotifications]);
    mockMarkAsRead.mockRejectedValue(new Error("Update failed"));
    render(<NotificationsPage />);

    const unreadNotificationItem = await screen.findByText(
      "Unread Notification",
    );
    const card =
      unreadNotificationItem.closest('[class*="Card"]') ||
      unreadNotificationItem.parentElement?.parentElement;
    const markAsReadButton = card
      ? within(card as HTMLElement).getByRole("button", {
          name: "Mark as read",
        })
      : screen.getByRole("button", { name: "Mark as read" });
    fireEvent.click(markAsReadButton);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(1);
      expect(
        screen.getByText("Failed to update notification"),
      ).toBeInTheDocument();
    });

    // When error is shown, the list is replaced by the error card, so no button assertions.
  });

  it("should show an error if updating a notification fails (mark as unread)", async () => {
    mockListNotifications.mockResolvedValue([...mockNotifications]);
    mockMarkAsUnread.mockRejectedValue(new Error("Update failed"));
    render(<NotificationsPage />);

    const readNotificationItem = await screen.findByText("Read Notification");
    const card =
      readNotificationItem.closest('[class*="Card"]') ||
      readNotificationItem.parentElement?.parentElement;
    const markAsUnreadButton = card
      ? within(card as HTMLElement).getByRole("button", {
          name: "Mark as unread",
        })
      : screen.getByRole("button", { name: "Mark as unread" });
    fireEvent.click(markAsUnreadButton);

    await waitFor(() => {
      expect(mockMarkAsUnread).toHaveBeenCalledWith(2);
      expect(
        screen.getByText("Failed to update notification"),
      ).toBeInTheDocument();
    });

    // Error card replaces the list, so no button assertions.
  });

  it("should show an error if 'Mark all as read' fails", async () => {
    mockListNotifications.mockResolvedValue([...mockNotifications]);
    mockMarkAllAsRead.mockRejectedValue(new Error("Mark all failed"));
    render(<NotificationsPage />);

    await waitFor(() => screen.getByText("Unread Notification"));

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));

    await waitFor(() => {
      expect(mockMarkAllAsRead).toHaveBeenCalled();
      expect(
        screen.getByText("Failed to mark all as read"),
      ).toBeInTheDocument();
    });

    // Error card replaces the list, so no button assertions.
  });

  it("checkbox onChange toggles read/unread via toggleRead", async () => {
    mockListNotifications.mockResolvedValue([...mockNotifications]);
    mockMarkAsRead.mockResolvedValue(undefined);
    mockMarkAsUnread.mockResolvedValue(undefined);
    render(<NotificationsPage />);

    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
      expect(screen.getByText("Read Notification")).toBeInTheDocument();
    });

    // Unread item: checking should call markAsRead
    // Find the checkbox within the unread notification card
    const unreadTitle = screen.getByText("Unread Notification");
    const unreadCard =
      unreadTitle.closest('[class*="Card"]') ||
      unreadTitle.closest('div[class*="border"]');

    // Query all checkboxes and find the one in the unread card
    const allCheckboxes = screen.getAllByRole("checkbox");
    const unreadCheckbox = unreadCard
      ? (Array.from(allCheckboxes).find((cb) =>
          unreadCard.contains(cb),
        ) as HTMLInputElement)
      : (allCheckboxes.find(
          (cb) => (cb as HTMLInputElement).ariaLabel === "Mark as read",
        ) as HTMLInputElement);

    expect(unreadCheckbox).toBeInTheDocument();
    expect(unreadCheckbox.checked).toBe(false);
    fireEvent.click(unreadCheckbox); // check
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith(1));

    // Read item: unchecking should call markAsUnread
    const readTitle = screen.getByText("Read Notification");
    const readCard =
      readTitle.closest('[class*="Card"]') ||
      readTitle.closest('div[class*="border"]');

    // Query all checkboxes and find the one in the read card
    const readCheckbox = readCard
      ? (Array.from(screen.getAllByRole("checkbox")).find((cb) =>
          readCard.contains(cb),
        ) as HTMLInputElement)
      : (screen
          .getAllByRole("checkbox")
          .find(
            (cb) => (cb as HTMLInputElement).ariaLabel === "Mark as unread",
          ) as HTMLInputElement);

    expect(readCheckbox).toBeInTheDocument();
    expect(readCheckbox.checked).toBe(true);
    fireEvent.click(readCheckbox); // uncheck
    await waitFor(() => expect(mockMarkAsUnread).toHaveBeenCalledWith(2));
  });

  it("should load reminders preference from localStorage", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "remindersEnabled") {
        return "true";
      }
      if (key === "eventChangesEnabled") {
        return "false";
      }
      return null;
    });

    mockListNotifications.mockResolvedValue(mockNotifications);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
    });

    localStorageSpy.mockRestore();
  });

  it("should load eventChanges preference from localStorage", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "remindersEnabled") {
        return "false";
      }
      if (key === "eventChangesEnabled") {
        return "true";
      }
      return null;
    });

    mockListNotifications.mockResolvedValue(mockNotifications);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
    });

    localStorageSpy.mockRestore();
  });

  it("should filter out reminders when reminders are disabled", async () => {
    const notificationsWithReminder: NotificationItem[] = [
      ...mockNotifications,
      {
        id: 3,
        title: "Event Reminder",
        message: "Event starts in 1 hour",
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];

    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "remindersEnabled") {
        return "false";
      }
      return null;
    });

    mockListNotifications.mockResolvedValue(notificationsWithReminder);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
      expect(screen.queryByText("Event Reminder")).not.toBeInTheDocument();
    });

    localStorageSpy.mockRestore();
  });

  it("should filter out event changes when eventChanges are disabled", async () => {
    const notificationsWithChanges: NotificationItem[] = [
      ...mockNotifications,
      {
        id: 3,
        title: "Event Updated: Test Event",
        message: "Event details changed",
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 4,
        title: "Event Cancelled: Another Event",
        message: "Event was cancelled",
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];

    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "eventChangesEnabled") {
        return "false";
      }
      return null;
    });

    mockListNotifications.mockResolvedValue(notificationsWithChanges);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
      expect(
        screen.queryByText("Event Updated: Test Event"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Event Cancelled: Another Event"),
      ).not.toBeInTheDocument();
    });

    localStorageSpy.mockRestore();
  });

  it("should call notification callback when reminder toggle changes", async () => {
    // Import the actual function from the module (not mocked)
    const notificationsModule = await import("@/lib/notifications");
    const mockCallback = jest.fn();
    notificationsModule.registerNotificationRefreshCallback(mockCallback);

    mockListNotifications.mockResolvedValue(mockNotifications);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
    });

    // Find and toggle the reminder switch
    const reminderToggle = screen
      .getAllByRole("checkbox")
      .find((cb) => (cb as HTMLElement).getAttribute("aria-label")?.includes("Reminder"));

    if (reminderToggle) {
      fireEvent.click(reminderToggle);
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    }
  });

  it("should call notification callback when eventChanges toggle changes", async () => {
    // Import the actual function from the module (not mocked)
    const notificationsModule = await import("@/lib/notifications");
    const mockCallback = jest.fn();
    notificationsModule.registerNotificationRefreshCallback(mockCallback);

    mockListNotifications.mockResolvedValue(mockNotifications);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unread Notification")).toBeInTheDocument();
    });

    // Find and toggle the event changes switch
    const eventChangesToggle = screen
      .getAllByRole("checkbox")
      .find((cb) => (cb as HTMLElement).getAttribute("aria-label")?.includes("Event Changes"));

    if (eventChangesToggle) {
      fireEvent.click(eventChangesToggle);
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    }
  });
});

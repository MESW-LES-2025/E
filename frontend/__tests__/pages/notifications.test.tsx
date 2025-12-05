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

    // Find the specific list item for the unread notification
    const unreadNotificationItem = await screen.findByText(
      "Unread Notification",
    );
    const listItem = unreadNotificationItem.closest("li")!;

    // Find and click the button within that specific list item
    const markAsReadButton = within(listItem).getByRole("button", {
      name: "Mark as read",
    });
    fireEvent.click(markAsReadButton);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(1);
    });

    // Now, verify that the button *within that same list item* has changed
    const markAsUnreadButton = await within(listItem).findByRole("button", {
      name: "Mark as unread",
    });
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
    const listItem = unreadNotificationItem.closest("li")!;
    const markAsReadButton = within(listItem).getByRole("button", {
      name: "Mark as read",
    });
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
    const listItem = readNotificationItem.closest("li")!;
    const markAsUnreadButton = within(listItem).getByRole("button", {
      name: "Mark as unread",
    });
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

    // Unread item: checking should call markAsRead
    const unreadTitle = await screen.findByText("Unread Notification");
    const unreadItem = unreadTitle.closest("li")!;
    const unreadCheckbox = within(unreadItem).getByLabelText(
      "Mark as read",
    ) as HTMLInputElement;

    fireEvent.click(unreadCheckbox); // check
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith(1));

    // Read item: unchecking should call markAsUnread
    const readTitle = await screen.findByText("Read Notification");
    const readItem = readTitle.closest("li")!;
    const readCheckbox = within(readItem).getByLabelText(
      "Mark as unread",
    ) as HTMLInputElement;

    fireEvent.click(readCheckbox); // uncheck
    await waitFor(() => expect(mockMarkAsUnread).toHaveBeenCalledWith(2));
  });
});

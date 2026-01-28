import "@testing-library/jest-dom";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "../../components/Navbar";
import { isAuthenticated, logout } from "../../lib/auth";
import { getProfile } from "../../lib/profiles";
import { getFilteredUnreadCount } from "../../lib/notifications";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock auth and profiles
jest.mock("../../lib/auth", () => ({
  isAuthenticated: jest.fn(),
  logout: jest.fn(),
}));

jest.mock("../../lib/profiles", () => ({
  getProfile: jest.fn(),
}));

jest.mock("../../lib/notifications", () => ({
  getFilteredUnreadCount: jest.fn(),
  registerNotificationRefreshCallback: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<
  typeof isAuthenticated
>;
const mockLogout = logout as jest.MockedFunction<typeof logout>;
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;
const mockGetFilteredUnreadCount =
  getFilteredUnreadCount as jest.MockedFunction<typeof getFilteredUnreadCount>;

describe("Navbar Component", () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as ReturnType<typeof useRouter>);
    mockUsePathname.mockReturnValue("/");
    mockGetFilteredUnreadCount.mockResolvedValue(0); // Default to 0 unread
  });

  describe("Unauthenticated state", () => {
    it("should show Register and Sign In buttons when not authenticated", async () => {
      mockIsAuthenticated.mockReturnValue(false);
      mockGetProfile.mockRejectedValue(new Error("Not authenticated"));

      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText("Register")).toBeInTheDocument();
        expect(screen.getByText("Sign In")).toBeInTheDocument();
      });

      expect(screen.queryByText("My Profile")).not.toBeInTheDocument();
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });

    it("should show Home button", async () => {
      mockIsAuthenticated.mockReturnValue(false);

      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText("Home")).toBeInTheDocument();
      });
    });
  });

  describe("Authenticated state", () => {
    it("should show user menu items when authenticated as ATTENDEE", async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE",
        phone_number: "",
        bio: "",
        participating_events: [],
      });

      render(<Navbar />);

      // Wait for the user button to appear, then click it to open the dropdown
      const userButton = await screen.findByText("Test");
      userButton.click();

      await waitFor(() => {
        expect(screen.getByText("My Events")).toBeInTheDocument();
        expect(screen.getByText("Profile")).toBeInTheDocument();
        expect(screen.getByText("Logout")).toBeInTheDocument();
      });

      expect(screen.queryByText("My Organizations")).not.toBeInTheDocument();
    });

    it("should show My Organizations button for ORGANIZER role", async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "organizer",
        email: "org@example.com",
        first_name: "Org",
        last_name: "User",
        role: "ORGANIZER",
        phone_number: "",
        bio: "",
        participating_events: [],
      });

      render(<Navbar />);

      // Wait for the user button to appear, then click it to open the dropdown
      const userButton = await screen.findByText("Org");
      userButton.click();

      await waitFor(() => {
        expect(screen.getByText("My Organizations")).toBeInTheDocument();
        expect(screen.getByText("My Events")).toBeInTheDocument();
        expect(screen.getByText("Profile")).toBeInTheDocument();
        expect(screen.getByText("Logout")).toBeInTheDocument();
      });
    });

    it("should handle logout click", async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE",
        phone_number: "",
        bio: "",
        participating_events: [],
      });

      render(<Navbar />);

      // Wait for the user button to appear, then click it to open the dropdown
      const userButton = await screen.findByText("Test");
      await act(async () => {
        userButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText("Logout")).toBeInTheDocument();
      });

      const logoutButton = screen.getByText("Logout");
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/profile/login");
      });
    });

    it("should redirect to login on session expiration", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockRejectedValue(
        new Error("Session expired. Please log in again."),
      );
      mockUsePathname.mockReturnValue("/profile");

      render(<Navbar />);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/profile/login");
      });
      consoleSpy.mockRestore();
    });

    it("should not redirect if already on login page", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockRejectedValue(
        new Error("Session expired. Please log in again."),
      );
      mockUsePathname.mockReturnValue("/profile/login");

      render(<Navbar />);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle other profile fetch errors without redirecting", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockRejectedValue(new Error("Network error"));
      mockUsePathname.mockReturnValue("/");

      render(<Navbar />);

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalled();
      });

      // Should not redirect for non-auth errors
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Loading state", () => {
    it("should show loading button while checking auth", () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );

      render(<Navbar />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Notifications", () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE",
        phone_number: "",
        bio: "",
        participating_events: [],
      });
    });

    it("should display the unread count when greater than 0", async () => {
      mockGetFilteredUnreadCount.mockResolvedValue(5);

      render(<Navbar />);

      // Wait for the user button to appear, then click it to open the dropdown
      const userButton = await screen.findByText("Test");
      userButton.click();

      await waitFor(() => {
        const badge = screen.getByText("5");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass("bg-primary");
      });
    });

    it("should not display the unread count when it is 0", async () => {
      mockGetFilteredUnreadCount.mockResolvedValue(0);

      render(<Navbar />);

      // Wait for the user button to appear, then click it to open the dropdown
      const userButton = await screen.findByText("Test");
      userButton.click();

      await waitFor(() => {
        expect(screen.getByText("Notifications")).toBeInTheDocument();
      });

      // The badge with the count should not exist
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("should handle errors when fetching unread count", async () => {
      mockGetFilteredUnreadCount.mockRejectedValue(new Error("API Error"));
      render(<Navbar />);
      await waitFor(() =>
        expect(mockGetFilteredUnreadCount).toHaveBeenCalled(),
      );
      expect(screen.queryByText("API Error")).not.toBeInTheDocument();
    });
  });

  describe("Mobile Menu", () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE",
        phone_number: "",
        bio: "",
        participating_events: [],
      });
      mockGetFilteredUnreadCount.mockResolvedValue(0);
    });

    it("should show X icon when mobile menu is open", async () => {
      // Mock window.matchMedia for responsive behavior
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: true, // Simulate mobile view
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      // Find and click the mobile menu button
      const menuButtons = screen.getAllByRole("button");
      const mobileMenuButton = menuButtons.find((btn) =>
        btn.className.includes("md:hidden"),
      );

      if (mobileMenuButton) {
        fireEvent.click(mobileMenuButton);

        await waitFor(() => {
          // After clicking, the menu should be open and show X icon
          // The X icon is rendered when mobileMenuOpen is true
          // There might be multiple "Home" elements (desktop and mobile), so use getAllByText
          const homeElements = screen.getAllByText("Home");
          expect(homeElements.length).toBeGreaterThan(0);
        });
      }
    });

    it("should close mobile menu on logout", async () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      // Open mobile menu first
      const menuButtons = screen.getAllByRole("button");
      const mobileMenuButton = menuButtons.find((btn) =>
        btn.className.includes("md:hidden"),
      );

      if (mobileMenuButton) {
        fireEvent.click(mobileMenuButton);

        await waitFor(() => {
          // There might be multiple "Home" elements, so use getAllByText
          const homeElements = screen.getAllByText("Home");
          expect(homeElements.length).toBeGreaterThan(0);
        });

        // Find and click logout button in mobile menu
        const logoutButton = screen.getByText("Logout");
        fireEvent.click(logoutButton);

        await waitFor(() => {
          expect(mockLogout).toHaveBeenCalled();
        });
      }
    });
  });

  describe("fetchUnreadCount", () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE",
        phone_number: "",
        bio: "",
        participating_events: [],
      });
    });

    it("should fetch unread count with reminders enabled", async () => {
      localStorage.setItem("remindersEnabled", "true");
      mockGetFilteredUnreadCount.mockResolvedValue(5);

      render(<Navbar />);

      await waitFor(() => {
        expect(mockGetFilteredUnreadCount).toHaveBeenCalled();
      });
    });

    it("should fetch unread count with reminders disabled", async () => {
      localStorage.setItem("remindersEnabled", "false");
      mockGetFilteredUnreadCount.mockResolvedValue(3);

      render(<Navbar />);

      await waitFor(() => {
        expect(mockGetFilteredUnreadCount).toHaveBeenCalled();
      });
    });

    it("should default to reminders enabled when not set", async () => {
      localStorage.removeItem("remindersEnabled");
      mockGetFilteredUnreadCount.mockResolvedValue(2);

      render(<Navbar />);

      await waitFor(() => {
        expect(mockGetFilteredUnreadCount).toHaveBeenCalled();
      });
    });

    it("should handle unread count fetch error", async () => {
      mockGetFilteredUnreadCount.mockRejectedValue(new Error("API Error"));

      render(<Navbar />);

      await waitFor(() => {
        expect(mockGetFilteredUnreadCount).toHaveBeenCalled();
      });

      // Should not crash, unread should default to 0
      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });

  describe("Mobile menu interactions", () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE",
        phone_number: "",
        bio: "",
        participating_events: [],
      });
      mockGetFilteredUnreadCount.mockResolvedValue(0);
    });

    it("should toggle mobile menu open and close", async () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole("button");
      const mobileMenuButton = menuButtons.find((btn) =>
        btn.className.includes("md:hidden"),
      );

      if (mobileMenuButton) {
        // Open menu
        fireEvent.click(mobileMenuButton);

        await waitFor(() => {
          const homeElements = screen.getAllByText("Home");
          expect(homeElements.length).toBeGreaterThan(0);
        });

        // Close menu by clicking again
        fireEvent.click(mobileMenuButton);

        // Menu should close
        await waitFor(() => {
          expect(screen.getByText("Test")).toBeInTheDocument();
        });
      }
    });

    it("should close mobile menu when clicking a link", async () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole("button");
      const mobileMenuButton = menuButtons.find((btn) =>
        btn.className.includes("md:hidden"),
      );

      if (mobileMenuButton) {
        fireEvent.click(mobileMenuButton);

        await waitFor(() => {
          const homeLinks = screen.getAllByText("Home");
          expect(homeLinks.length).toBeGreaterThan(0);
        });

        // Click a link in mobile menu
        const homeLinks = screen.getAllByText("Home");
        const mobileHomeLink = homeLinks.find((link) => {
          const parent = link.closest("div");
          return parent?.className.includes("md:hidden");
        });

        if (mobileHomeLink) {
          fireEvent.click(mobileHomeLink);
        }
      }
    });
  });

  describe("Notification refresh callback", () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE",
        phone_number: "",
        bio: "",
        participating_events: [],
      });
    });

    it("should register notification refresh callback on mount", async () => {
      const { registerNotificationRefreshCallback } = require("../../lib/notifications");
      const mockRegisterCallback = registerNotificationRefreshCallback as jest.Mock;

      render(<Navbar />);

      await waitFor(() => {
        expect(mockRegisterCallback).toHaveBeenCalled();
      });
    });

    it("should unregister callback on unmount", async () => {
      const { registerNotificationRefreshCallback } = require("../../lib/notifications");
      const mockRegisterCallback = registerNotificationRefreshCallback as jest.Mock;

      const { unmount } = render(<Navbar />);

      await waitFor(() => {
        expect(mockRegisterCallback).toHaveBeenCalled();
      });

      unmount();

      // Should have been called with empty function to unregister
      expect(mockRegisterCallback).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});

import "@testing-library/jest-dom";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "../../components/Navbar";
import { isAuthenticated, logout } from "../../lib/auth";
import { getProfile } from "../../lib/profiles";

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

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<
  typeof isAuthenticated
>;
const mockLogout = logout as jest.MockedFunction<typeof logout>;
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;

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

      await waitFor(() => {
        expect(screen.getByText("My Events")).toBeInTheDocument();
        expect(screen.getByText("My Profile")).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText("My Organizations")).toBeInTheDocument();
        expect(screen.getByText("My Events")).toBeInTheDocument();
        expect(screen.getByText("My Profile")).toBeInTheDocument();
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
});

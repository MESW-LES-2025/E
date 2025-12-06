import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ProfilePage from "../../app/profile/page";
import { isAuthenticated } from "../../lib/auth";
import { getProfile, updateProfile } from "../../lib/profiles";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock auth and profiles
jest.mock("../../lib/auth", () => ({
  isAuthenticated: jest.fn(),
}));

jest.mock("../../lib/profiles", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<
  typeof isAuthenticated
>;
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;
const mockUpdateProfile = updateProfile as jest.MockedFunction<
  typeof updateProfile
>;

describe("Profile Page", () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: mockReplace,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as ReturnType<typeof useRouter>);
  });

  describe("Authentication", () => {
    it("should redirect to login when not authenticated", async () => {
      mockIsAuthenticated.mockReturnValue(false);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/profile/login");
      });
    });

    it("should load profile when authenticated", async () => {
      const mockProfile = {
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE" as const,
        phone_number: "123456789",
        bio: "Test bio",
        participating_events: [1, 2],
      };

      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue(mockProfile);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
        expect(
          screen.getByDisplayValue("test@example.com"),
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
        expect(screen.getByDisplayValue("User")).toBeInTheDocument();
      });
    });
  });

  describe("Profile display", () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
    });

    it("should display all profile fields", async () => {
      const mockProfile = {
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "John",
        last_name: "Doe",
        role: "ORGANIZER" as const,
        phone_number: "123456789",
        bio: "Test bio",
        participating_events: [],
      };

      mockGetProfile.mockResolvedValue(mockProfile);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
        expect(
          screen.getByDisplayValue("test@example.com"),
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
        expect(screen.getByDisplayValue("123456789")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test bio")).toBeInTheDocument();
      });
    });

    it("should show role label correctly", async () => {
      const mockProfile = {
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ORGANIZER" as const,
        phone_number: "",
        bio: "",
        participating_events: [],
      };

      mockGetProfile.mockResolvedValue(mockProfile);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Organizer")).toBeInTheDocument();
      });
    });
  });

  describe("Edit functionality", () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE" as const,
        phone_number: "123456789",
        bio: "Original bio",
        participating_events: [],
      });
    });

    it("should enable edit mode when Edit button is clicked", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      const editButton = screen.getByText("Edit Profile");
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("Save Changes")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });
    });

    it("should update profile when Save is clicked", async () => {
      const updatedProfile = {
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE" as const,
        phone_number: "987654321",
        bio: "Updated bio",
        participating_events: [],
      };

      mockUpdateProfile.mockResolvedValue(updatedProfile);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Profile"));

      await waitFor(() => {
        const phoneInput = screen.getByLabelText(/phone/i);
        fireEvent.change(phoneInput, { target: { value: "987654321" } });
      });

      const bioInput = screen.getByLabelText(/bio/i);
      fireEvent.change(bioInput, { target: { value: "Updated bio" } });

      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          phone_number: "987654321",
          bio: "Updated bio",
        });
      });
    });

    it("should cancel edit and restore original values", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Profile"));

      await waitFor(() => {
        const phoneInput = screen.getByLabelText(/phone/i);
        fireEvent.change(phoneInput, { target: { value: "999999999" } });
      });

      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.getByDisplayValue("123456789")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Original bio")).toBeInTheDocument();
      });
    });
  });

  describe("Error handling", () => {
    it("should display error message when profile fetch fails", async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockRejectedValue(new Error("Failed to load profile"));

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load profile/i)).toBeInTheDocument();
      });
    });

    it("should display error message when update fails", async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetProfile.mockResolvedValue({
        id: 1,
        user_id: 1,
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "ATTENDEE" as const,
        phone_number: "",
        bio: "",
        participating_events: [],
      });
      mockUpdateProfile.mockRejectedValue(new Error("Update failed"));

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Profile"));
      fireEvent.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(screen.getByText(/Update failed/i)).toBeInTheDocument();
      });
    });
  });

  it("should display no profile data message when profile is null", async () => {
    mockIsAuthenticated.mockReturnValue(true);
    // getProfile returns null, which sets profile to null
    mockGetProfile.mockResolvedValue(null);

    render(<ProfilePage />);

    // Wait for loading to finish and null profile to be set
    await waitFor(
      () => {
        expect(
          screen.getByText("No profile data available"),
        ).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });
});

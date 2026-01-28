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

jest.mock("../../lib/organizations", () => ({
  getFollowedOrganizations: jest.fn(),
  unfollowOrganization: jest.fn(),
}));

jest.mock("../../lib/events", () => ({
  getInterestedEvents: jest.fn(),
  unmarkEventAsInterested: jest.fn(),
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

  it("should handle localStorage error when loading active tab", () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "profile_active_tab") {
        throw new Error("Storage error");
      }
      return null;
    });

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

    render(<ProfilePage />);

    // Should handle error gracefully
    expect(screen.getByText(/profile/i)).toBeInTheDocument();

    localStorageSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should handle localStorage error when saving active tab", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "setItem");
    localStorageSpy.mockImplementation(() => {
      throw new Error("Storage error");
    });

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

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
    });

    localStorageSpy.mockRestore();
  });

  it("should load active tab from localStorage", async () => {
    const orgModule = await import("../../lib/organizations");
    const { getFollowedOrganizations } = orgModule;
    const mockGetFollowedOrganizations = getFollowedOrganizations as jest.Mock;
    mockGetFollowedOrganizations.mockResolvedValue([]);

    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "profile_active_tab") {
        return "followed";
      }
      return null;
    });

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

    render(<ProfilePage />);

    await waitFor(
      () => {
        expect(screen.getByText(/profile/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // Verify that followed organizations tab is active (it should fetch)
    await waitFor(
      () => {
        expect(mockGetFollowedOrganizations).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    localStorageSpy.mockRestore();
  });

  describe("Followed Organizations", () => {
    beforeEach(() => {
      jest.clearAllMocks();
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
    });

    it("should fetch followed organizations when tab is active", async () => {
      const orgModule = await import("../../lib/organizations");
      const { getFollowedOrganizations } = orgModule;
      const mockGetFollowedOrganizations =
        getFollowedOrganizations as jest.Mock;
      mockGetFollowedOrganizations.mockResolvedValue([
        {
          id: 1,
          name: "Test Org",
          description: "Test Description",
          email: "test@example.com",
          website: "",
          phone: "",
          address: "",
          city: "Porto",
          country: "Portugal",
          logo_url: null,
          cover_image_url: null,
          twitter_handle: "",
          facebook_url: "",
          linkedin_url: "",
          instagram_handle: "",
          organization_type: null,
          established_date: null,
          owner_name: "Owner",
          event_count: 5,
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);

      render(<ProfilePage />);

      await waitFor(
        () => {
          expect(screen.getByText("Profile Information")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Click on Followed Organizations tab - use getAllByText and get the button
      const followedTabs = screen.getAllByText("Followed Organizations");
      const followedTab =
        followedTabs.find((el) => el.tagName === "BUTTON") || followedTabs[0];
      fireEvent.click(followedTab);

      await waitFor(
        () => {
          expect(mockGetFollowedOrganizations).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );
    });

    it("should handle unfollow organization", async () => {
      const orgModule = await import("../../lib/organizations");
      const { getFollowedOrganizations, unfollowOrganization } = orgModule;
      const mockGetFollowedOrganizations =
        getFollowedOrganizations as jest.Mock;
      const mockUnfollowOrganization = unfollowOrganization as jest.Mock;

      mockGetFollowedOrganizations.mockResolvedValue([
        {
          id: 1,
          name: "Test Org",
          description: "Test Description",
          email: "test@example.com",
          website: "",
          phone: "",
          address: "",
          city: "",
          country: "",
          logo_url: null,
          cover_image_url: null,
          twitter_handle: "",
          facebook_url: "",
          linkedin_url: "",
          instagram_handle: "",
          organization_type: null,
          established_date: null,
          owner_name: "Owner",
          event_count: 0,
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);
      mockUnfollowOrganization.mockResolvedValue(undefined);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Profile Information")).toBeInTheDocument();
      });

      // Click on Followed Organizations tab - use getAllByText and get the button
      const followedTabs = screen.getAllByText("Followed Organizations");
      const followedTab =
        followedTabs.find((el) => el.tagName === "BUTTON") || followedTabs[0];
      fireEvent.click(followedTab);

      await waitFor(() => {
        expect(screen.getByText("Test Org")).toBeInTheDocument();
      });

      const unfollowButton = screen.getByText("Unfollow");
      fireEvent.click(unfollowButton);

      await waitFor(() => {
        expect(mockUnfollowOrganization).toHaveBeenCalledWith(1);
      });
    });

    it("should handle unfollow organization error", async () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const orgModule = await import("../../lib/organizations");
      const { getFollowedOrganizations, unfollowOrganization } = orgModule;
      const mockGetFollowedOrganizations =
        getFollowedOrganizations as jest.Mock;
      const mockUnfollowOrganization = unfollowOrganization as jest.Mock;

      mockGetFollowedOrganizations.mockResolvedValue([
        {
          id: 1,
          name: "Test Org",
          description: "Test Description",
          email: "test@example.com",
          website: "",
          phone: "",
          address: "",
          city: "",
          country: "",
          logo_url: null,
          cover_image_url: null,
          twitter_handle: "",
          facebook_url: "",
          linkedin_url: "",
          instagram_handle: "",
          organization_type: null,
          established_date: null,
          owner_name: "Owner",
          event_count: 0,
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);
      mockUnfollowOrganization.mockRejectedValue(
        new Error("Failed to unfollow"),
      );

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Profile Information")).toBeInTheDocument();
      });

      // Click on Followed Organizations tab - use getAllByText and get the button
      const followedTabs = screen.getAllByText("Followed Organizations");
      const followedTab =
        followedTabs.find((el) => el.tagName === "BUTTON") || followedTabs[0];
      fireEvent.click(followedTab);

      await waitFor(() => {
        expect(screen.getByText("Test Org")).toBeInTheDocument();
      });

      const unfollowButton = screen.getByText("Unfollow");
      fireEvent.click(unfollowButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Interested Events", () => {
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
        phone_number: "",
        bio: "",
        participating_events: [],
      });
    });

    it("should fetch interested events when tab is active", async () => {
      const eventsModule = await import("../../lib/events");
      const { getInterestedEvents } = eventsModule;
      const mockGetInterestedEvents = getInterestedEvents as jest.Mock;
      mockGetInterestedEvents.mockResolvedValue([
        {
          id: 1,
          name: "Test Event",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Test Location",
          description: "Test Description",
          category: "SOCIAL",
          participant_count: 5,
          interest_count: 10,
          is_participating: false,
          is_interested: true,
          is_full: false,
          organizer_name: "Organizer",
        },
      ]);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Profile Information")).toBeInTheDocument();
      });

      // Click on Interested Events tab - use getAllByText and get the button
      const interestedTabs = screen.getAllByText("Interested Events");
      const interestedTab =
        interestedTabs.find((el) => el.tagName === "BUTTON") ||
        interestedTabs[0];
      fireEvent.click(interestedTab);

      await waitFor(() => {
        expect(mockGetInterestedEvents).toHaveBeenCalled();
      });
    });

    it("should handle remove interest", async () => {
      const eventsModule = await import("../../lib/events");
      const { getInterestedEvents, unmarkEventAsInterested } = eventsModule;
      const mockGetInterestedEvents = getInterestedEvents as jest.Mock;
      const mockUnmarkEventAsInterested = unmarkEventAsInterested as jest.Mock;

      mockGetInterestedEvents.mockResolvedValue([
        {
          id: 1,
          name: "Test Event",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Test Location",
          description: "Test Description",
          category: "SOCIAL",
          participant_count: 5,
          interest_count: 10,
          is_participating: false,
          is_interested: true,
          is_full: false,
          organizer_name: "Organizer",
        },
      ]);
      mockUnmarkEventAsInterested.mockResolvedValue(undefined);

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Profile Information")).toBeInTheDocument();
      });

      // Click on Interested Events tab - use getAllByText and get the button
      const interestedTabs = screen.getAllByText("Interested Events");
      const interestedTab =
        interestedTabs.find((el) => el.tagName === "BUTTON") ||
        interestedTabs[0];
      fireEvent.click(interestedTab);

      await waitFor(() => {
        expect(screen.getByText("Test Event")).toBeInTheDocument();
      });

      const removeButton = screen.getByText("Remove Interest");
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockUnmarkEventAsInterested).toHaveBeenCalledWith(1);
      });
    });

    it("should handle remove interest error", async () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const eventsModule = await import("../../lib/events");
      const { getInterestedEvents, unmarkEventAsInterested } = eventsModule;
      const mockGetInterestedEvents = getInterestedEvents as jest.Mock;
      const mockUnmarkEventAsInterested = unmarkEventAsInterested as jest.Mock;

      mockGetInterestedEvents.mockResolvedValue([
        {
          id: 1,
          name: "Test Event",
          date: new Date(Date.now() + 86400000).toISOString(),
          location: "Test Location",
          description: "Test Description",
          category: "SOCIAL",
          participant_count: 5,
          interest_count: 10,
          is_participating: false,
          is_interested: true,
          is_full: false,
          organizer_name: "Organizer",
        },
      ]);
      mockUnmarkEventAsInterested.mockRejectedValue(
        new Error("Failed to remove interest"),
      );

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText("Profile Information")).toBeInTheDocument();
      });

      // Click on Interested Events tab - use getAllByText and get the button
      const interestedTabs = screen.getAllByText("Interested Events");
      const interestedTab =
        interestedTabs.find((el) => el.tagName === "BUTTON") ||
        interestedTabs[0];
      fireEvent.click(interestedTab);

      await waitFor(() => {
        expect(screen.getByText("Test Event")).toBeInTheDocument();
      });

      const removeButton = screen.getByText("Remove Interest");
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

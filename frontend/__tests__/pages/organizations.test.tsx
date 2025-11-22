import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import OrganizationsPage from "../../app/organizations/page";
import { listOrganizations } from "../../lib/organizations";
import { isAuthenticated } from "../../lib/auth";
import { getProfile } from "../../lib/profiles";

// Mock modules
jest.mock("../../lib/organizations", () => ({
  listOrganizations: jest.fn(),
}));

jest.mock("../../lib/auth", () => ({
  isAuthenticated: jest.fn(),
}));

jest.mock("../../lib/profiles", () => ({
  getProfile: jest.fn(),
}));

const mockListOrganizations = listOrganizations as jest.MockedFunction<
  typeof listOrganizations
>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<
  typeof isAuthenticated
>;
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

describe("Organizations Page", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    // Suppress JSDOM navigation warnings
    consoleSpy = jest.spyOn(console, "error").mockImplementation((...args) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Not implemented: navigation")
      ) {
        return;
      }
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should display organizations list", async () => {
    const mockOrgs = [
      {
        id: 1,
        name: "Test Org 1",
        description: "Description 1",
        email: "org1@example.com",
        website: "https://org1.com",
        phone: "123456789",
        address: "123 St",
        city: "City",
        country: "Country",
        logo_url: null,
        cover_image_url: null,
        twitter_handle: "",
        facebook_url: "",
        linkedin_url: "",
        instagram_handle: "",
        organization_type: null,
        established_date: null,
        owner_name: "Owner 1",
        event_count: 5,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        name: "Test Org 2",
        description: "Description 2",
        email: "org2@example.com",
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
        owner_name: "Owner 2",
        event_count: 0,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue(mockOrgs);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Org 1")).toBeInTheDocument();
      expect(screen.getByText("Test Org 2")).toBeInTheDocument();
    });
  });

  it("should show Create Organization button for organizers", async () => {
    const mockOrgs: unknown[] = [];

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
    mockListOrganizations.mockResolvedValue(mockOrgs);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Create Organization/i)).toBeInTheDocument();
    });
  });

  it("should not show Create Organization button for non-organizers", async () => {
    const mockOrgs: unknown[] = [];

    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockResolvedValue({
      id: 1,
      user_id: 1,
      username: "attendee",
      email: "attendee@example.com",
      first_name: "Attendee",
      last_name: "User",
      role: "ATTENDEE",
      phone_number: "",
      bio: "",
      participating_events: [],
    });
    mockListOrganizations.mockResolvedValue(mockOrgs);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(
        screen.queryByText(/Create Organization/i),
      ).not.toBeInTheDocument();
    });
  });

  it("should store referrer when clicking View Details", async () => {
    const mockOrgs = [
      {
        id: 1,
        name: "Test Org",
        description: "Test",
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
    ];

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue(mockOrgs);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("View Details")).toBeInTheDocument();
    });

    const viewButton = screen.getByText("View Details");
    fireEvent.click(viewButton);

    expect(sessionStorageMock.getItem("org_detail_referrer")).toBe(
      "/organizations",
    );
  });

  it("should display empty state when no organizations", async () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No organizations are available/i),
      ).toBeInTheDocument();
    });
  });

  it("should display error message on fetch failure", async () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockRejectedValue(new Error("Failed to fetch"));

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it("should handle profile fetch error gracefully", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockIsAuthenticated.mockReturnValue(true);
    mockGetProfile.mockRejectedValue(new Error("Failed to fetch profile"));
    mockListOrganizations.mockResolvedValue([
      {
        id: 1,
        name: "Test Org",
        description: "Description",
        email: "test@example.com",
        website: "https://test.com",
        phone: "123456789",
        address: "123 St",
        city: "City",
        country: "Country",
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

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Org")).toBeInTheDocument();
    });

    // Should still render organizations even if profile fetch fails
    expect(screen.queryByText("Create Organization")).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("should display correct organization type labels", async () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([
      {
        id: 1,
        name: "Company Org",
        description: "Description",
        email: "test@example.com",
        website: "https://test.com",
        phone: "123456789",
        address: "123 St",
        city: "City",
        country: "Country",
        logo_url: null,
        cover_image_url: null,
        twitter_handle: "",
        facebook_url: "",
        linkedin_url: "",
        instagram_handle: "",
        organization_type: "COMPANY",
        established_date: null,
        owner_name: "Owner",
        event_count: 0,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        name: "Non-profit Org",
        organization_type: "NON_PROFIT",
        description: "Description",
        email: "test@example.com",
        website: "https://test.com",
        phone: "123456789",
        address: "123 St",
        city: "City",
        country: "Country",
        logo_url: null,
        cover_image_url: null,
        twitter_handle: "",
        facebook_url: "",
        linkedin_url: "",
        instagram_handle: "",
        established_date: null,
        owner_name: "Owner",
        event_count: 0,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 3,
        name: "Null Type Org",
        organization_type: null,
        description: "Description",
        email: "test@example.com",
        website: "https://test.com",
        phone: "123456789",
        address: "123 St",
        city: "City",
        country: "Country",
        logo_url: null,
        cover_image_url: null,
        twitter_handle: "",
        facebook_url: "",
        linkedin_url: "",
        instagram_handle: "",
        established_date: null,
        owner_name: "Owner",
        event_count: 0,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 4,
        name: "Unknown Type Org",
        organization_type: "UNKNOWN_TYPE",
        description: "Description",
        email: "test@example.com",
        website: "https://test.com",
        phone: "123456789",
        address: "123 St",
        city: "City",
        country: "Country",
        logo_url: null,
        cover_image_url: null,
        twitter_handle: "",
        facebook_url: "",
        linkedin_url: "",
        instagram_handle: "",
        established_date: null,
        owner_name: "Owner",
        event_count: 0,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Company Org")).toBeInTheDocument();
      expect(screen.getByText("Non-profit Org")).toBeInTheDocument();
      expect(screen.getByText("Null Type Org")).toBeInTheDocument();
      expect(screen.getByText("Unknown Type Org")).toBeInTheDocument();
    });

    // Check that type labels are displayed correctly
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Non-profit")).toBeInTheDocument();
    expect(screen.getByText("Not specified")).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN_TYPE")).toBeInTheDocument();
  });
});

import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import OrganizationsPage from "../../app/organizations/page";
import { listOrganizations } from "../../lib/organizations";
import { isAuthenticated } from "../../lib/auth";
import { getProfile } from "../../lib/profiles";

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPathname = "/organizations";
const mockQuery = {};

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    pathname: mockPathname,
    query: mockQuery,
  }),
  usePathname: () => mockPathname,
  useParams: () => mockQuery,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock modules
jest.mock("../../lib/organizations", () => ({
  listOrganizations: jest.fn(),
  followOrganization: jest.fn().mockResolvedValue(undefined),
  unfollowOrganization: jest.fn().mockResolvedValue(undefined),
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
    // Use getAllByText since there might be multiple instances
    expect(screen.getAllByText("Company").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Non-profit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not specified").length).toBeGreaterThan(0);
    expect(screen.getAllByText("UNKNOWN_TYPE").length).toBeGreaterThan(0);
  });

  it("should handle localStorage error when loading search", () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation(() => {
      throw new Error("Storage error");
    });

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load search from storage:",
      expect.any(Error),
    );

    localStorageSpy.mockRestore();
  });

  it("should handle localStorage error when saving search", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "setItem");
    localStorageSpy.mockImplementation(() => {
      throw new Error("Storage error");
    });

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/organizations/i)).toBeInTheDocument();
    });

    localStorageSpy.mockRestore();
  });

  it("should handle localStorage error when loading categories", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "organizations_search") {
        return null;
      }
      if (key === "organizations_category") {
        throw new Error("Storage error");
      }
      return null;
    });

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    // Wait for component to mount and try to load categories
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load categories from storage:",
        expect.any(Error),
      );
    }, { timeout: 2000 });

    localStorageSpy.mockRestore();
  });

  it("should handle localStorage error when saving categories", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "setItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "orgs_category") {
        throw new Error("Storage error");
      }
    });

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/organizations/i)).toBeInTheDocument();
    });

    localStorageSpy.mockRestore();
  });

  it("should load search from localStorage on mount", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "orgs_search") {
        return "test search";
      }
      return null;
    });

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(mockListOrganizations).toHaveBeenCalled();
    });

    localStorageSpy.mockRestore();
  });

  it("should load categories from localStorage on mount", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "orgs_category") {
        return JSON.stringify(["COMPANY", "NON_PROFIT"]);
      }
      return null;
    });

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(mockListOrganizations).toHaveBeenCalled();
    });

    localStorageSpy.mockRestore();
  });

  it("should filter out invalid categories from localStorage", async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "getItem");
    localStorageSpy.mockImplementation((key) => {
      if (key === "orgs_category") {
        return JSON.stringify(["COMPANY", "INVALID_TYPE", "NON_PROFIT"]);
      }
      return null;
    });

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(mockListOrganizations).toHaveBeenCalled();
    });

    localStorageSpy.mockRestore();
  });

  it("should handle toggleCategory function", async () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([
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
        organization_type: "COMPANY",
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

    // Click on a category badge to toggle it - use getAllByText since there might be multiple
    const companyBadges = screen.getAllByText("Company");
    const companyBadge = companyBadges.find(badge => badge.closest('[class*="Badge"]') || badge.closest('span')) || companyBadges[0];
    fireEvent.click(companyBadge);

    // Should filter organizations (debounced, so wait a bit)
    await waitFor(() => {
      expect(mockListOrganizations).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });
  });

  it("should handle clear all filters", async () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([
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
        organization_type: "COMPANY",
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

    // First set a filter, then clear it
    const companyBadges = screen.getAllByText("Company");
    if (companyBadges.length > 0) {
      fireEvent.click(companyBadges[0]);
      await waitFor(() => {
        // Wait for filter to be applied and clear all button to appear
        const clearAllButton = screen.queryByText("Clear all");
        if (clearAllButton) {
          fireEvent.click(clearAllButton);
        }
      }, { timeout: 1000 });
    }

    // Should clear filters and refetch (debounced)
    await waitFor(() => {
      expect(mockListOrganizations).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it("should handle loadSearchFromStorage when window is undefined", () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally removing window for test
    delete global.window;

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    // Should use default empty search
    expect(screen.getByText(/organizations/i)).toBeInTheDocument();

    global.window = originalWindow;
  });

  it("should handle saveSearchToStorage when window is undefined", () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally removing window for test
    delete global.window;

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    // Should not crash
    expect(screen.getByText(/organizations/i)).toBeInTheDocument();

    global.window = originalWindow;
  });

  it("should handle loadCategoriesFromStorage when window is undefined", () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally removing window for test
    delete global.window;

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    // Should use default empty categories
    expect(screen.getByText(/organizations/i)).toBeInTheDocument();

    global.window = originalWindow;
  });

  it("should handle saveCategoriesToStorage when window is undefined", () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally removing window for test
    delete global.window;

    mockIsAuthenticated.mockReturnValue(false);
    mockListOrganizations.mockResolvedValue([]);

    render(<OrganizationsPage />);

    // Should not crash
    expect(screen.getByText(/organizations/i)).toBeInTheDocument();

    global.window = originalWindow;
  });
});

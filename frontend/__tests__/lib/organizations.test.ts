import "@testing-library/jest-dom";
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationEvents,
  getMyOrganizations,
} from "../../lib/organizations";
import { fetchWithAuth } from "../../lib/auth";

// Mock the auth module
jest.mock("../../lib/auth", () => ({
  fetchWithAuth: jest.fn(),
}));

const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<
  typeof fetchWithAuth
>;

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("Organizations API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("listOrganizations", () => {
    it("should fetch and return list of organizations", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
          email: "test@example.com",
          website: "https://test.com",
          phone: "123456789",
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
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
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      } as Response);

      const result = await listOrganizations();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/"),
      );
      expect(result).toEqual(mockOrganizations);
    });

    it("should handle paginated response", async () => {
      const mockResponse = {
        results: [
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
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await listOrganizations();

      expect(result).toEqual(mockResponse.results);
    });

    it("should throw error on failed fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Failed to fetch" }),
      } as Response);

      await expect(listOrganizations()).rejects.toThrow("Failed to fetch");
    });
  });

  describe("getOrganization", () => {
    it("should fetch organization by ID", async () => {
      const mockOrg = {
        id: 1,
        name: "Test Org",
        owner_id: 1,
        updated_at: "2024-01-01T00:00:00Z",
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
      };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrg,
      } as Response);

      const result = await getOrganization(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockOrg);
    });

    it("should throw error on failed fetch", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Not found" }),
      } as Response);

      await expect(getOrganization(999)).rejects.toThrow("Not found");
    });
  });

  describe("createOrganization", () => {
    it("should create organization with valid payload", async () => {
      const mockPayload = {
        name: "New Org",
        description: "New description",
        email: "new@example.com",
      };

      const mockCreatedOrg = {
        id: 1,
        ...mockPayload,
        owner_id: 1,
        updated_at: "2024-01-01T00:00:00Z",
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
      };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedOrg,
      } as Response);

      const result = await createOrganization(mockPayload);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/"),
        {
          method: "POST",
          body: JSON.stringify(mockPayload),
        },
      );
      expect(result).toEqual(mockCreatedOrg);
    });

    it("should throw error with permission message on 403", async () => {
      const mockPayload = { name: "New Org" };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Permission denied" }),
      } as Response);

      await expect(createOrganization(mockPayload)).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should throw default permission message when detail is missing on 403", async () => {
      const mockPayload = { name: "New Org" };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      } as Response);

      await expect(createOrganization(mockPayload)).rejects.toThrow(
        "You don't have permission to create organizations. Only users with ORGANIZER role can create organizations.",
      );
    });

    it("should throw default error message when detail is missing", async () => {
      const mockPayload = { name: "New Org" };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(createOrganization(mockPayload)).rejects.toThrow(
        "Failed to create organization",
      );
    });

    it("should throw validation errors on 400", async () => {
      const mockPayload = { name: "" };

      const mockError = {
        name: ["This field is required."],
      };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockError,
      } as Response);

      await expect(createOrganization(mockPayload)).rejects.toEqual(mockError);
    });
  });

  describe("updateOrganization", () => {
    it("should update organization", async () => {
      const mockPayload = { name: "Updated Org" };

      const mockUpdatedOrg = {
        id: 1,
        name: "Updated Org",
        owner_id: 1,
        updated_at: "2024-01-01T00:00:00Z",
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
      };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedOrg,
      } as Response);

      const result = await updateOrganization(1, mockPayload);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/"),
        {
          method: "PATCH",
          body: JSON.stringify(mockPayload),
        },
      );
      expect(result).toEqual(mockUpdatedOrg);
    });

    it("should handle JSON parse error in updateOrganization", async () => {
      const mockPayload = { name: "Updated Org" };

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      await expect(updateOrganization(1, mockPayload)).rejects.toThrow(
        "Failed to update organization",
      );
    });
  });

  describe("deleteOrganization", () => {
    it("should delete organization", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await deleteOrganization(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/"),
        { method: "DELETE" },
      );
    });

    it("should throw error on failed delete", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Not found" }),
      } as Response);

      await expect(deleteOrganization(999)).rejects.toThrow("Not found");
    });
  });

  describe("getOrganizationEvents", () => {
    it("should fetch organization events", async () => {
      const mockEvents = [
        {
          id: 1,
          name: "Test Event",
          date: "2024-12-31T00:00:00Z",
          location: "Test Location",
          description: "Test description",
          status: "Active",
          capacity: 100,
          participants: [1, 2],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents,
      } as Response);

      const result = await getOrganizationEvents(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/events/"),
      );
      expect(result).toEqual(mockEvents);
    });

    it("should handle JSON parse error in getOrganizationEvents", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      await expect(getOrganizationEvents(1)).rejects.toThrow(
        "Failed to fetch organization events",
      );
    });
  });

  describe("getMyOrganizations", () => {
    it("should fetch user's organizations", async () => {
      const mockOrgs = [
        {
          id: 1,
          name: "My Org",
          owner_id: 1,
          updated_at: "2024-01-01T00:00:00Z",
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

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrgs,
      } as Response);

      const result = await getMyOrganizations();

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/me/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockOrgs);
    });

    it("should handle JSON parse error in getMyOrganizations", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      await expect(getMyOrganizations()).rejects.toThrow(
        "Failed to fetch my organizations",
      );
    });
  });
});

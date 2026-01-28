import "@testing-library/jest-dom";
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationEvents,
  getMyOrganizations,
  searchUsers,
  getCollaborators,
  addCollaborator,
  removeCollaborator,
  followOrganization,
  unfollowOrganization,
  getFollowedOrganizations,
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

    it("should include search parameter in URL when provided", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
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
        json: async () => mockOrganizations,
      } as Response);

      await listOrganizations("test search");

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("search=test"),
        { method: "GET" },
      );
    });

    it("should not include search parameter when search is empty or whitespace", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
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
        json: async () => mockOrganizations,
      } as Response);

      await listOrganizations("   ");

      const callUrl = mockFetchWithAuth.mock.calls[0][0] as string;
      expect(callUrl).not.toContain("search=");
    });

    it("should include organization_type parameter when single type provided", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
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
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      } as Response);

      await listOrganizations(undefined, "COMPANY");

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("organization_type=COMPANY"),
        { method: "GET" },
      );
    });

    it("should include multiple organization_type parameters when array provided", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
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
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      } as Response);

      await listOrganizations(undefined, ["COMPANY", "NON_PROFIT"]);

      const callUrl = mockFetchWithAuth.mock.calls[0][0] as string;
      expect(callUrl).toContain("organization_type=COMPANY");
      expect(callUrl).toContain("organization_type=NON_PROFIT");
    });

    it("should fallback to public fetch when fetchWithAuth returns 401", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
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
        ok: false,
        status: 401,
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      } as Response);

      const result = await listOrganizations();

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockOrganizations);
    });

    it("should fallback to public fetch when fetchWithAuth returns 403", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
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
        ok: false,
        status: 403,
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      } as Response);

      const result = await listOrganizations();

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockOrganizations);
    });

    it("should fallback to public fetch when fetchWithAuth throws error", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Test Org",
          description: "Test description",
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

      mockFetchWithAuth.mockRejectedValueOnce(new Error("Network error"));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      } as Response);

      const result = await listOrganizations();

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockOrganizations);
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

    it("should fallback to public fetch when fetchWithAuth returns 401", async () => {
      const mockEvents = [
        {
          id: 1,
          name: "Test Event",
          date: "2024-12-31T00:00:00Z",
          status: "Active",
        },
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents,
      } as Response);

      const result = await getOrganizationEvents(1);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });

    it("should fallback to public fetch when fetchWithAuth returns 403", async () => {
      const mockEvents = [
        {
          id: 1,
          name: "Test Event",
          date: "2024-12-31T00:00:00Z",
          status: "Active",
        },
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents,
      } as Response);

      const result = await getOrganizationEvents(1);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });

    it("should fallback to public fetch when fetchWithAuth throws error", async () => {
      const mockEvents = [
        {
          id: 1,
          name: "Test Event",
          date: "2024-12-31T00:00:00Z",
          status: "Active",
        },
      ];

      mockFetchWithAuth.mockRejectedValueOnce(new Error("Network error"));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents,
      } as Response);

      const result = await getOrganizationEvents(1);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
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

  describe("searchUsers", () => {
    it("should return empty array when query is less than 2 characters", async () => {
      const result = await searchUsers("a");
      expect(result).toEqual([]);
      expect(mockFetchWithAuth).not.toHaveBeenCalled();
    });

    it("should search users with valid query", async () => {
      const mockUsers = [
        {
          id: 1,
          username: "user1",
          email: "user1@example.com",
          first_name: "John",
          last_name: "Doe",
          role: "ATTENDEE",
        },
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      } as Response);

      const result = await searchUsers("user");

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/search_users/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockUsers);
    });

    it("should encode query parameter correctly", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      await searchUsers("user name");

      const callUrl = mockFetchWithAuth.mock.calls[0][0] as string;
      expect(callUrl).toContain("q=user%20name");
    });

    it("should throw error on failed search", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Search failed" }),
      } as Response);

      await expect(searchUsers("user")).rejects.toThrow("Search failed");
    });

    it("should throw default error when response has no detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(searchUsers("user")).rejects.toThrow(
        "Failed to search users",
      );
    });
  });

  describe("getCollaborators", () => {
    it("should fetch collaborators for organization", async () => {
      const mockCollaborators = [
        {
          id: 1,
          username: "collab1",
          email: "collab1@example.com",
          first_name: "Jane",
          last_name: "Smith",
          role: "ORGANIZER",
        },
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCollaborators,
      } as Response);

      const result = await getCollaborators(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/collaborators/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockCollaborators);
    });

    it("should throw error on failed fetch", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Not found" }),
      } as Response);

      await expect(getCollaborators(999)).rejects.toThrow("Not found");
    });

    it("should throw default error when response has no detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(getCollaborators(1)).rejects.toThrow(
        "Failed to fetch collaborators",
      );
    });
  });

  describe("addCollaborator", () => {
    it("should add collaborator to organization", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await addCollaborator(1, 2);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/collaborators/2/"),
        { method: "POST" },
      );
    });

    it("should throw error on failed add", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "User not found" }),
      } as Response);

      await expect(addCollaborator(1, 999)).rejects.toThrow("User not found");
    });

    it("should throw default error when response has no detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(addCollaborator(1, 2)).rejects.toThrow(
        "Failed to add collaborator",
      );
    });
  });

  describe("removeCollaborator", () => {
    it("should remove collaborator from organization", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await removeCollaborator(1, 2);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/collaborators/2/"),
        { method: "DELETE" },
      );
    });

    it("should throw error on failed remove", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Collaborator not found" }),
      } as Response);

      await expect(removeCollaborator(1, 999)).rejects.toThrow(
        "Collaborator not found",
      );
    });

    it("should throw default error when response has no detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(removeCollaborator(1, 2)).rejects.toThrow(
        "Failed to remove collaborator",
      );
    });
  });

  describe("followOrganization", () => {
    it("should follow organization", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await followOrganization(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/follow/"),
        { method: "POST" },
      );
    });

    it("should throw error on failed follow", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Organization not found" }),
      } as Response);

      await expect(followOrganization(999)).rejects.toThrow(
        "Organization not found",
      );
    });

    it("should throw default error when response has no detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(followOrganization(1)).rejects.toThrow(
        "Failed to follow organization",
      );
    });
  });

  describe("unfollowOrganization", () => {
    it("should unfollow organization", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await unfollowOrganization(1);

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/1/follow/"),
        { method: "DELETE" },
      );
    });

    it("should throw error on failed unfollow", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Not following" }),
      } as Response);

      await expect(unfollowOrganization(999)).rejects.toThrow("Not following");
    });

    it("should throw default error when response has no detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(unfollowOrganization(1)).rejects.toThrow(
        "Failed to unfollow organization",
      );
    });
  });

  describe("getFollowedOrganizations", () => {
    it("should fetch followed organizations", async () => {
      const mockOrganizations = [
        {
          id: 1,
          name: "Followed Org",
          description: "Test description",
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
          is_following: true,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrganizations,
      } as Response);

      const result = await getFollowedOrganizations();

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("/accounts/organizations/followed/"),
        { method: "GET" },
      );
      expect(result).toEqual(mockOrganizations);
    });

    it("should throw error on failed fetch", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Unauthorized" }),
      } as Response);

      await expect(getFollowedOrganizations()).rejects.toThrow("Unauthorized");
    });

    it("should throw default error when response has no detail", async () => {
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

      await expect(getFollowedOrganizations()).rejects.toThrow(
        "Failed to fetch followed organizations",
      );
    });
  });
});

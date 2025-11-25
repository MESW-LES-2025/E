import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import EventModal from "@/components/EventModal";

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPathname = "/";
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

// Mock getProfile
jest.mock("@/lib/profiles", () => ({
  getProfile: jest.fn().mockResolvedValue({ role: "ATTENDEE" }),
}));

// Mock getOrganization
jest.mock("@/lib/organizations", () => ({
  getOrganization: jest.fn().mockResolvedValue({
    id: 1,
    name: "Test Organization",
    is_following: false,
  }),
}));

// Mock fetchWithAuth and isAuthenticated
const mockFetchWithAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
  isAuthenticated: jest.fn().mockReturnValue(false),
}));

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

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

// Mock window.location using delete and assign
// Suppress JSDOM navigation warnings
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn((...args) => {
    const firstArg = args[0];
    // Suppress JSDOM navigation warnings
    if (
      (typeof firstArg === "string" &&
        (firstArg.includes("Not implemented: navigation") ||
          firstArg.includes("navigation"))) ||
      (firstArg &&
        typeof firstArg === "object" &&
        firstArg.type === "not implemented")
    ) {
      return;
    }
    // Suppress VirtualConsole navigation warnings
    const message = args.join(" ");
    if (message.includes("navigation") || message.includes("Not implemented")) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
});

delete (window as unknown as { location?: Location }).location;
(window as unknown as { location: Partial<Location> }).location = {
  pathname: "/",
  href: "http://localhost:3000/",
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

describe("EventModal - Organization Link", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockFetchWithAuth.mockClear();
    // Mock fetchWithAuth to return the same as regular fetch for these tests
    mockFetchWithAuth.mockImplementation((url: string) => {
      return mockFetch(url);
    });
  });

  it("should display organization name as link instead of organizer", async () => {
    const mockEvent = {
      id: 1,
      name: "Test Event",
      date: new Date(Date.now() + 86400000).toISOString(),
      location: "Test Location",
      description: "Test Description",
      status: "Active",
      organizer: 1,
      organizer_name: "Organizer Name",
      organization: 1,
      organization_id: 1,
      organization_name: "Test Organization",
      capacity: 100,
      participant_count: 50,
      is_participating: false,
      is_full: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvent,
    } as Response);

    const onClose = jest.fn();

    render(<EventModal id="1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    // Should show "Created by" with organizer name when organization exists
    // The organizer name should be shown as part of "Created by" text
    expect(screen.getByText(/Created by/i)).toBeInTheDocument();
    expect(screen.getByText("Organizer Name")).toBeInTheDocument();
  });

  it("should store referrer when clicking organization link", async () => {
    const mockEvent = {
      id: 1,
      name: "Test Event",
      date: new Date(Date.now() + 86400000).toISOString(),
      location: "Test Location",
      description: "Test Description",
      status: "Active",
      organizer: 1,
      organizer_name: "Organizer",
      organization: 1,
      organization_id: 1,
      organization_name: "Test Organization",
      capacity: 100,
      participant_count: 50,
      is_participating: false,
      is_full: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvent,
    } as Response);

    const onClose = jest.fn();

    render(<EventModal id="1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    const orgLink = screen.getByText("Test Organization").closest("a");
    if (orgLink) {
      fireEvent.click(orgLink);
    }

    expect(sessionStorageMock.getItem("org_detail_referrer")).toBe("/");
  });

  it("should link to organization detail page", async () => {
    const mockEvent = {
      id: 1,
      name: "Test Event",
      date: new Date(Date.now() + 86400000).toISOString(),
      location: "Test Location",
      description: "Test Description",
      status: "Active",
      organizer: 1,
      organizer_name: "Organizer",
      organization: 1,
      organization_id: 1,
      organization_name: "Test Organization",
      capacity: 100,
      participant_count: 50,
      is_participating: false,
      is_full: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvent,
    } as Response);

    const onClose = jest.fn();

    render(<EventModal id="1" onClose={onClose} />);

    await waitFor(() => {
      const orgLink = screen
        .getByText("Test Organization")
        .closest("a") as HTMLAnchorElement;
      expect(orgLink).toBeInTheDocument();
      expect(orgLink.href).toContain("/organizations/1");
    });
  });
});

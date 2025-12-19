"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listOrganizations,
  type PublicOrganization,
  type OrganizationType,
} from "@/lib/organizations";
import { isAuthenticated } from "@/lib/auth";
import { getProfile, type Profile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrganizationCard from "@/components/OrganizationCard";

const STORAGE_KEY_ORGS_SEARCH = "organizations_search";
const STORAGE_KEY_ORGS_CATEGORY = "organizations_category";

const ORGANIZATION_TYPES: { value: OrganizationType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "COMPANY", label: "Company" },
  { value: "NON_PROFIT", label: "Non-profit" },
  { value: "COMMUNITY", label: "Community" },
  { value: "EDUCATIONAL", label: "Educational" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "OTHER", label: "Other" },
];

// Load search query from localStorage
const loadSearchFromStorage = (): string => {
  if (typeof window === "undefined") return "";
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ORGS_SEARCH);
    return stored || "";
  } catch (e) {
    console.error("Failed to load search from storage:", e);
    return "";
  }
};

// Save search query to localStorage
const saveSearchToStorage = (search: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ORGS_SEARCH, search);
  } catch (e) {
    console.error("Failed to save search to storage:", e);
  }
};

// Load category filters from localStorage
const loadCategoriesFromStorage = (): OrganizationType[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ORGS_CATEGORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Validate that all stored values are valid organization types
        return parsed.filter((cat) =>
          ORGANIZATION_TYPES.some((t) => t.value === cat && t.value !== "")
        ) as OrganizationType[];
      }
    }
  } catch (e) {
    console.error("Failed to load categories from storage:", e);
  }
  return [];
};

// Save category filters to localStorage
const saveCategoriesToStorage = (categories: OrganizationType[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ORGS_CATEGORY, JSON.stringify(categories));
  } catch (e) {
    console.error("Failed to save categories to storage:", e);
  }
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<PublicOrganization[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<OrganizationType[]>([]);

  useEffect(() => {
    setMounted(true);
    setIsAuth(isAuthenticated());
    // Load search query and categories from localStorage after mount (client-side only)
    const storedSearch = loadSearchFromStorage();
    const storedCategories = loadCategoriesFromStorage();
    setSearchQuery(storedSearch);
    setSelectedCategories(storedCategories);
  }, []);

  // Save search query to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      saveSearchToStorage(searchQuery);
    }
  }, [searchQuery, mounted]);

  // Save category filters to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      saveCategoriesToStorage(selectedCategories);
    }
  }, [selectedCategories, mounted]);

  const toggleCategory = (category: OrganizationType) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  useEffect(() => {
    if (!mounted) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch organizations with search query and category filters
        const orgsData = await listOrganizations(
          searchQuery,
          selectedCategories.length > 0 ? selectedCategories : undefined
        );
        setOrganizations(orgsData);
        setFilteredOrganizations(orgsData);

        // Fetch user profile to check role (only if authenticated)
        if (isAuth) {
          try {
            const profileData = await getProfile();
            setProfile(profileData);
          } catch (err) {
            // If profile fetch fails, just continue without showing create button
            console.error("Failed to load profile:", err);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load organizations",
        );
      } finally {
        setLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [mounted, isAuth, searchQuery, selectedCategories]);

  if (!mounted || loading) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <p>Loading organizations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isOrganizer = profile?.role === "ORGANIZER";

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Organizations</h1>
            <p className="text-muted-foreground text-lg">
              Connect with organizations creating amazing events
            </p>
          </div>
          {isOrganizer && filteredOrganizations.length > 0 && (
            <Button asChild>
              <Link href="/organizations/create">Create Organization</Link>
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 pb-6 border-b">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search organizations by name, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">Type:</span>
            {ORGANIZATION_TYPES.filter((t) => t.value !== "").map((type) => {
              const isSelected = selectedCategories.includes(type.value as OrganizationType);
              return (
                <Badge
                  key={type.value}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? "hover:bg-primary/90 hover:shadow-md"
                      : "hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                  }`}
                  onClick={() => toggleCategory(type.value as OrganizationType)}
                >
                  {type.label}
                  {isSelected && <X className="h-3 w-3 ml-1.5" />}
                </Badge>
              );
            })}
            {(selectedCategories.length > 0 || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategories([]);
                  setSearchQuery("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground ml-auto"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {filteredOrganizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {isOrganizer
                ? "No organizations have been created yet. Create the first one to get started!"
                : "No organizations are available at the moment. Check back later!"}
            </p>
            {isOrganizer && (
              <Button asChild className="mt-4">
                <Link href="/organizations/create">Create Organization</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {(searchQuery || selectedCategories.length > 0) && (
            <p className="text-sm text-muted-foreground mb-4">
              Found {filteredOrganizations.length} organization
              {filteredOrganizations.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
              {selectedCategories.length > 0 && (
                <>
                  {" of type"}
                  {selectedCategories.length === 1
                    ? ` "${ORGANIZATION_TYPES.find((t) => t.value === selectedCategories[0])?.label}"`
                    : `s: ${selectedCategories.map((cat) => ORGANIZATION_TYPES.find((t) => t.value === cat)?.label).join(", ")}`}
                </>
              )}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.map((org) => (
              <OrganizationCard
                key={org.id}
                organization={org}
                referrer="/organizations"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

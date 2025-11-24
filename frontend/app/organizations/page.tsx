"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listOrganizations,
  type PublicOrganization,
} from "@/lib/organizations";
import { isAuthenticated } from "@/lib/auth";
import { getProfile, type Profile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuth(isAuthenticated());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch organizations
        const orgsData = await listOrganizations();
        setOrganizations(orgsData);

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

    fetchData();
  }, [mounted, isAuth]);

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

  const getOrganizationTypeLabel = (type: string | null) => {
    if (!type) return "Not specified";
    const typeMap: Record<string, string> = {
      COMPANY: "Company",
      NON_PROFIT: "Non-profit",
      COMMUNITY: "Community",
      EDUCATIONAL: "Educational",
      GOVERNMENT: "Government",
      OTHER: "Other",
    };
    return typeMap[type] || type;
  };

  const isOrganizer = profile?.role === "ORGANIZER";

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Organizations</h1>
        {isOrganizer && organizations.length > 0 && (
          <Button asChild>
            <Link href="/organizations/create">Create Organization</Link>
          </Button>
        )}
      </div>

      {organizations.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <CardTitle className="line-clamp-2">{org.name}</CardTitle>
                <CardDescription>
                  {getOrganizationTypeLabel(org.organization_type)}
                  {org.event_count > 0 && (
                    <span className="ml-2">
                      • {org.event_count} event
                      {org.event_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {org.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                    {org.description}
                  </p>
                )}
                {org.city && org.country && (
                  <p className="text-sm text-muted-foreground">
                    📍 {org.city}, {org.country}
                  </p>
                )}
                {org.owner_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    By {org.owner_name}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href={`/organizations/${org.id}`}
                    onClick={() =>
                      sessionStorage.setItem(
                        "org_detail_referrer",
                        "/organizations",
                      )
                    }
                  >
                    View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

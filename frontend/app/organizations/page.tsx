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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrganizationCard from "@/components/OrganizationCard";

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
            <OrganizationCard
              key={org.id}
              organization={org}
              referrer="/organizations"
            />
          ))}
        </div>
      )}
    </div>
  );
}

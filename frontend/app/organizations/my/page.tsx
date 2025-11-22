"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getProfile, type Profile } from "@/lib/profiles";
import { getMyOrganizations, type Organization } from "@/lib/organizations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MyOrganizationsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const authenticated = isAuthenticated();
    setAuthed(authenticated);

    if (!authenticated) {
      router.replace("/profile/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const profileData = await getProfile();
        setProfile(profileData);

        // Check if user has ORGANIZER role
        if (profileData.role !== "ORGANIZER") {
          router.replace("/organizations");
          return;
        }

        // Fetch user's organizations
        const orgs = await getMyOrganizations();
        setOrganizations(orgs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load organizations",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (!mounted || !authed || loading) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <p>Loading...</p>
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
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => router.push("/organizations")}
            >
              Back to Organizations
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (profile?.role !== "ORGANIZER") {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only users with ORGANIZER role can access this page.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => router.push("/organizations")}
            >
              Browse Organizations
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Organizations</h1>
        {organizations.length > 0 && (
          <Button asChild>
            <Link href="/organizations/create">Create Organization</Link>
          </Button>
        )}
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any organizations yet.
            </p>
            <Button asChild>
              <Link href="/organizations/create">
                Create Your First Organization
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{org.name}</CardTitle>
                <CardDescription>
                  {org.event_count > 0 && (
                    <span>
                      {org.event_count} event{org.event_count !== 1 ? "s" : ""}
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
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link
                    href={`/organizations/${org.id}`}
                    onClick={() =>
                      sessionStorage.setItem(
                        "org_detail_referrer",
                        "/organizations/my",
                      )
                    }
                  >
                    View
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/organizations/${org.id}/edit`}>Edit</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

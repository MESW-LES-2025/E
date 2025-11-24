"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getProfile, updateProfile, type Profile } from "@/lib/profiles";
import {
  getFollowedOrganizations,
  type PublicOrganization,
} from "@/lib/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export default function ProfilePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "followed">("profile");

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");

  // Followed organizations state
  const [followedOrgs, setFollowedOrgs] = useState<PublicOrganization[]>([]);
  const [followedOrgsLoading, setFollowedOrgsLoading] = useState(false);
  const [followedOrgsError, setFollowedOrgsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // Set mounted to true after component mounts (client-side only)
    setMounted(true);
    const authenticated = isAuthenticated();
    setAuthed(authenticated);

    if (!authenticated) {
      router.replace("/profile/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProfile();
        if (!data) {
          setProfile(null);
          setPhoneNumber("");
          setBio("");
          return;
        }
        setProfile(data);
        setPhoneNumber(data.phone_number || "");
        setBio(data.bio || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Fetch followed organizations when tab is active
  useEffect(() => {
    if (activeTab === "followed" && authed) {
      const fetchFollowedOrgs = async () => {
        try {
          setFollowedOrgsLoading(true);
          setFollowedOrgsError(null);
          const data = await getFollowedOrganizations();
          setFollowedOrgs(data);
        } catch (err) {
          setFollowedOrgsError(
            err instanceof Error
              ? err.message
              : "Failed to load followed organizations",
          );
        } finally {
          setFollowedOrgsLoading(false);
        }
      };

      fetchFollowedOrgs();
    }
  }, [activeTab, authed]);

  // Don't render anything until after hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError(null);
    if (profile) {
      setPhoneNumber(profile.phone_number || "");
      setBio(profile.bio || "");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      const updated = await updateProfile({
        phone_number: phoneNumber,
        bio: bio,
      });
      setProfile(updated);
      setIsEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!authed) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.refresh()}>Retry</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p>No profile data available</p>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      ATTENDEE: "Attendee",
      ORGANIZER: "Organizer",
      ADMIN: "Admin",
    };
    return roleMap[role] || role;
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
      </div>

      {/* Tabs */}
      {profile.role === "ATTENDEE" && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab("followed")}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === "followed"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Followed Organizations
            </button>
          </nav>
        </div>
      )}

      {/* Profile Information Tab */}
      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              View and manage your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {/* Read-only fields */}
              <Field>
                <FieldLabel>Username</FieldLabel>
                <FieldContent>
                  <Input value={profile.username} disabled />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input value={profile.email} disabled />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>First Name</FieldLabel>
                <FieldContent>
                  <Input value={profile.first_name} disabled />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Last Name</FieldLabel>
                <FieldContent>
                  <Input value={profile.last_name} disabled />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Role</FieldLabel>
                <FieldContent>
                  <Input value={getRoleLabel(profile.role)} disabled />
                </FieldContent>
              </Field>

              {/* Editable fields */}
              <Field>
                <FieldLabel htmlFor="phone_number">Phone Number</FieldLabel>
                <FieldContent>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                  />
                  <FieldDescription>
                    Optional: Add your phone number for event notifications
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="bio">Bio</FieldLabel>
                <FieldContent>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                  <FieldDescription>
                    Optional: Write a short bio about yourself
                  </FieldDescription>
                </FieldContent>
              </Field>

              {saveError && (
                <Field>
                  <FieldError>{saveError}</FieldError>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex gap-2">
            {!isEditing ? (
              <Button onClick={handleEdit}>Edit Profile</Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      )}

      {/* Followed Organizations Tab */}
      {activeTab === "followed" && (
        <Card>
          <CardHeader>
            <CardTitle>Followed Organizations</CardTitle>
            <CardDescription>
              Organizations you are following to track their events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {followedOrgsLoading ? (
              <p className="text-muted-foreground">Loading organizations...</p>
            ) : followedOrgsError ? (
              <div className="text-red-600">
                <p>Error: {followedOrgsError}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setFollowedOrgsError(null);
                    setActiveTab("followed");
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : followedOrgs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You are not following any organizations yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Visit an organization page and click &quot;Follow
                  Organization&quot; to start tracking their events.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {followedOrgs.map((org) => (
                  <Card key={org.id} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link
                            href={`/organizations/${org.id}`}
                            className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={() => {
                              sessionStorage.setItem(
                                "org_detail_referrer",
                                "/profile",
                              );
                            }}
                          >
                            {org.name}
                          </Link>
                          {org.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {org.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            {org.event_count > 0 && (
                              <span>
                                {org.event_count} active event
                                {org.event_count !== 1 ? "s" : ""}
                              </span>
                            )}
                            {org.city && org.country && (
                              <span>
                                📍 {org.city}, {org.country}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Participating Events (always visible) */}
      {profile.participating_events.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Participating Events</CardTitle>
            <CardDescription>
              You are registered for {profile.participating_events.length} event
              {profile.participating_events.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Event IDs: {profile.participating_events.join(", ")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getOrganization,
  getOrganizationEvents,
  searchUsers,
  getCollaborators,
  addCollaborator,
  removeCollaborator,
  followOrganization,
  unfollowOrganization,
  type Organization,
  type PublicOrganization,
  type OrganizationEvent,
  type UserSearchResult,
  type Collaborator,
} from "@/lib/organizations";
import { isAuthenticated } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EventModal from "@/components/EventModal";
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
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = Number(params.id);

  const [organization, setOrganization] = useState<
    Organization | PublicOrganization | null
  >(null);
  const [events, setEvents] = useState<OrganizationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Collaborator management state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [collaboratorError, setCollaboratorError] = useState<string | null>(
    null,
  );
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Get the referrer from sessionStorage
    const storedReferrer = sessionStorage.getItem("org_detail_referrer");
    if (storedReferrer) {
      setReferrer(storedReferrer);
      // Don't remove it here - only remove when back button is clicked
      // This allows it to persist if we navigate back to this page after creating an event
    }

    // Fetch user profile to check role
    if (isAuthenticated()) {
      getProfile()
        .then((profile) => {
          if (profile) {
            setUserRole(profile.role);
          }
        })
        .catch(() => {
          // Silently fail
        });
    }
  }, []);

  // Check for referrer updates when pathname changes (e.g., after creating an event)
  useEffect(() => {
    const storedReferrer = sessionStorage.getItem("org_detail_referrer");
    if (storedReferrer && storedReferrer !== referrer) {
      setReferrer(storedReferrer);
    }
  }, [pathname, referrer]);

  useEffect(() => {
    if (isNaN(id)) {
      setError("Invalid organization ID");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgData = await getOrganization(id);
        setOrganization(orgData);
        // Check if user is owner (has owner_id field)
        setIsOwner("owner_id" in orgData);
        // Check if user is a collaborator
        setIsCollaborator(orgData.is_collaborator || false);
        // Check if user is following
        setIsFollowing(orgData.is_following || false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load organization",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const fetchEvents = useCallback(async () => {
    if (!organization) return;
    try {
      setEventsLoading(true);
      const eventsData = await getOrganizationEvents(id);
      setEvents(eventsData);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setEventsLoading(false);
    }
  }, [organization, id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch collaborators if user is owner
  useEffect(() => {
    if (!organization || !isOwner) return;

    const fetchCollaborators = async () => {
      try {
        setCollaboratorsLoading(true);
        const collaboratorsData = await getCollaborators(id);
        setCollaborators(collaboratorsData);
      } catch (err) {
        console.error("Failed to load collaborators:", err);
      } finally {
        setCollaboratorsLoading(false);
      }
    };

    fetchCollaborators();
  }, [organization, id, isOwner]);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        setCollaboratorError(null);
        const results = await searchUsers(searchQuery);
        // Filter out users who are already collaborators or the owner
        const ownerId =
          organization && "owner_id" in organization
            ? organization.owner_id
            : null;
        const filteredResults = results.filter(
          (user) =>
            user.id !== ownerId &&
            !collaborators.some((collab) => collab.id === user.id),
        );
        setSearchResults(filteredResults);
      } catch (err) {
        console.error("Failed to search users:", err);
        setCollaboratorError(
          err instanceof Error ? err.message : "Failed to search users",
        );
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, organization, collaborators]);

  const handleAddCollaborator = async (user: UserSearchResult) => {
    try {
      setCollaboratorError(null);
      await addCollaborator(id, user.id);
      // Refresh collaborators list
      const updatedCollaborators = await getCollaborators(id);
      setCollaborators(updatedCollaborators);
      // Clear search
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      setCollaboratorError(
        err instanceof Error ? err.message : "Failed to add collaborator",
      );
    }
  };

  const handleRemoveCollaborator = async (userId: number) => {
    try {
      setCollaboratorError(null);
      await removeCollaborator(id, userId);
      // Refresh collaborators list
      const updatedCollaborators = await getCollaborators(id);
      setCollaborators(updatedCollaborators);
    } catch (err) {
      setCollaboratorError(
        err instanceof Error ? err.message : "Failed to remove collaborator",
      );
    }
  };

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

  const handleFollowToggle = async () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Store current pathname to return after login
      sessionStorage.setItem("login_redirect", window.location.pathname);
      router.push("/profile/login");
      return;
    }

    try {
      setFollowLoading(true);
      if (isFollowing) {
        await unfollowOrganization(id);
        setIsFollowing(false);
        // Update organization state
        if (organization) {
          setOrganization({ ...organization, is_following: false });
        }
      } else {
        await followOrganization(id);
        setIsFollowing(true);
        // Update organization state
        if (organization) {
          setOrganization({ ...organization, is_following: true });
        }
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      // Show error to user (could add toast notification here)
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update follow status. Please try again.",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <p>Loading organization...</p>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error || "Organization not found"}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => {
                const storedReferrer = sessionStorage.getItem(
                  "org_detail_referrer",
                );
                if (storedReferrer) {
                  router.push(storedReferrer);
                } else {
                  router.push("/organizations");
                }
              }}
            >
              Back to Organizations
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (referrer) {
              // Clear the referrer when using it
              sessionStorage.removeItem("org_detail_referrer");
              router.push(referrer);
            } else {
              router.back();
            }
          }}
        >
          ← Back
        </Button>
        <div className="flex gap-2">
          {userRole === "ATTENDEE" && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              onClick={handleFollowToggle}
              disabled={followLoading}
              className="group relative"
            >
              <span className={isFollowing ? "group-hover:hidden" : ""}>
                {followLoading
                  ? "Loading..."
                  : isFollowing
                    ? "Following"
                    : "Follow Organization"}
              </span>
              {isFollowing && !followLoading && (
                <span className="hidden group-hover:inline">Unfollow</span>
              )}
            </Button>
          )}
          {isOwner && (
            <Button asChild>
              <Link
                href={`/organizations/${id}/edit`}
                onClick={() => {
                  if (referrer) {
                    sessionStorage.setItem("org_edit_referrer", referrer);
                  }
                }}
              >
                Edit Organization
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{organization.name}</CardTitle>
              <CardDescription className="mt-2">
                {getOrganizationTypeLabel(organization.organization_type)}
                {organization.event_count > 0 && (
                  <span className="ml-2">
                    • {organization.event_count} event
                    {organization.event_count !== 1 ? "s" : ""}
                  </span>
                )}
              </CardDescription>
            </div>
            {organization.logo_url && (
              <Image
                src={organization.logo_url}
                alt={`${organization.name} logo`}
                width={80}
                height={80}
                className="object-contain rounded-lg"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {organization.cover_image_url && (
            <Image
              src={organization.cover_image_url}
              alt={`${organization.name} cover`}
              width={800}
              height={192}
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
          )}

          {organization.description && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {organization.description}
              </p>
            </div>
          )}

          <FieldGroup>
            {organization.email && (
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <a
                    href={`mailto:${organization.email}`}
                    className="text-primary hover:underline"
                  >
                    {organization.email}
                  </a>
                </FieldContent>
              </Field>
            )}

            {organization.website && (
              <Field>
                <FieldLabel>Website</FieldLabel>
                <FieldContent>
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {organization.website}
                  </a>
                </FieldContent>
              </Field>
            )}

            {organization.phone && (
              <Field>
                <FieldLabel>Phone</FieldLabel>
                <FieldContent>
                  <a
                    href={`tel:${organization.phone}`}
                    className="text-primary hover:underline"
                  >
                    {organization.phone}
                  </a>
                </FieldContent>
              </Field>
            )}

            {(organization.address ||
              organization.city ||
              organization.country) && (
              <Field>
                <FieldLabel>Location</FieldLabel>
                <FieldContent>
                  <p>
                    {[
                      organization.address,
                      organization.city,
                      organization.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </FieldContent>
              </Field>
            )}

            {organization.established_date && (
              <Field>
                <FieldLabel>Established</FieldLabel>
                <FieldContent>
                  <p>
                    {new Date(
                      organization.established_date,
                    ).toLocaleDateString()}
                  </p>
                </FieldContent>
              </Field>
            )}

            <Field>
              <FieldLabel>Owner</FieldLabel>
              <FieldContent>
                <p>
                  {"owner_name" in organization
                    ? organization.owner_name
                    : "Unknown"}
                </p>
              </FieldContent>
            </Field>
          </FieldGroup>

          {(organization.twitter_handle ||
            organization.facebook_url ||
            organization.linkedin_url ||
            organization.instagram_handle) && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Social Media</h3>
              <div className="flex gap-4 flex-wrap">
                {organization.twitter_handle && (
                  <a
                    href={`https://twitter.com/${organization.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Twitter: @{organization.twitter_handle}
                  </a>
                )}
                {organization.facebook_url && (
                  <a
                    href={organization.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Facebook
                  </a>
                )}
                {organization.linkedin_url && (
                  <a
                    href={organization.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    LinkedIn
                  </a>
                )}
                {organization.instagram_handle && (
                  <a
                    href={`https://instagram.com/${organization.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Instagram: @{organization.instagram_handle}
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collaborators Section (only for owners) */}
      {isOwner && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Collaborators</CardTitle>
            <CardDescription>
              Add organizers as collaborators who can create, update, and cancel
              events for this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search for users */}
            <div className="mb-6">
              <Field>
                <FieldLabel>Search for Organizers</FieldLabel>
                <FieldContent>
                  <Input
                    type="text"
                    placeholder="Search by username, name, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searching && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Searching...
                    </p>
                  )}
                  {collaboratorError && (
                    <FieldError>{collaboratorError}</FieldError>
                  )}
                </FieldContent>
              </Field>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Search Results:</p>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username} • {user.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddCollaborator(user)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current collaborators */}
            <div>
              <p className="text-sm font-medium mb-3">Current Collaborators:</p>
              {collaboratorsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No collaborators yet. Search above to add organizers.
                </p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {collaborator.first_name} {collaborator.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{collaborator.username} • {collaborator.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRemoveCollaborator(collaborator.id)
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                Events organized by {organization.name}
              </CardDescription>
            </div>
            {(isOwner || isCollaborator) && (
              <Button asChild>
                <Link
                  href={`/create-event?organization=${id}`}
                  onClick={() => {
                    // Store current referrer before navigating to create event
                    if (referrer) {
                      sessionStorage.setItem("org_detail_referrer", referrer);
                    } else {
                      // Store current pathname as referrer if no referrer exists
                      sessionStorage.setItem(
                        "org_detail_referrer",
                        window.location.pathname,
                      );
                    }
                  }}
                >
                  Create Event
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">No events found.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="border relative">
                  {(isOwner || isCollaborator) && event.status && (
                    <span
                      className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-md z-10 font-semibold ${
                        event.status === "Active"
                          ? "bg-green-500"
                          : event.status === "Cancelled" ||
                              event.status === "Canceled"
                            ? "bg-red-500"
                            : "bg-gray-500"
                      }`}
                    >
                      {event.status}
                    </span>
                  )}
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-lg">{event.name}</h4>
                    {event.date && (
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleString()}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm text-muted-foreground">
                        📍 {event.location}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSelectedEventId(String(event.id));
                        setModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && selectedEventId && (
        <EventModal
          id={selectedEventId}
          onClose={() => {
            setModalOpen(false);
            setSelectedEventId(null);
            // Refresh events list to update status badges
            fetchEvents();
          }}
          onInterestChange={(eventId, isInterested, interestCount) => {
            // Update the event in the events array if it exists
            setEvents((prevEvents) =>
              prevEvents.map((e) =>
                e.id === eventId ? { ...e, interest_count: interestCount } : e,
              ),
            );
          }}
          onParticipationChange={(
            eventId,
            isParticipating,
            participantCount,
            isFull,
          ) => {
            // Update the event in the events array if it exists
            setEvents((prevEvents) =>
              prevEvents.map((e) =>
                e.id === eventId
                  ? {
                      ...e,
                      participant_count: participantCount,
                      is_participating: isParticipating,
                      is_full: isFull,
                    }
                  : e,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

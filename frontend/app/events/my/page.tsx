"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getProfile, type ProfileRole } from "@/lib/profiles";
import { fetchWithAuth } from "@/lib/auth";
import { getMyOrganizedEvents, type Event } from "@/lib/events";
import { getMyOrganizations, type Organization } from "@/lib/organizations";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EventModal from "@/components/EventModal";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

type OrganizedEventsByOrg = {
  [organizationName: string]: Event[];
};

const CATEGORY_COLORS: Record<string, string> = {
  SOCIAL: "bg-blue-500 text-white",
  ACADEMIC: "bg-green-500 text-white",
  TRAVEL: "bg-yellow-500 text-black",
  SPORTS: "bg-red-500 text-white",
  CULTURAL: "bg-purple-500 text-white",
  VOLUNTEERING: "bg-teal-500 text-white",
  NIGHTLIFE: "bg-pink-500 text-white",
};

export default function MyEventsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userRole, setUserRole] = useState<ProfileRole | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [ownedOrganizationIds, setOwnedOrganizationIds] = useState<Set<number>>(
    new Set(),
  );
  const [organizedEvents, setOrganizedEvents] = useState<OrganizedEventsByOrg>(
    {},
  );
  const [participatingEvents, setParticipatingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Create event form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
    description: "",
    capacity: "",
    category: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitError, setFormSubmitError] = useState<string>("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const authenticated = isAuthenticated();
    setAuthed(authenticated);

    if (!authenticated) {
      router.replace("/profile/login");
      return;
    }

    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user profile to check role and get participating event IDs
        const profile = await getProfile();
        setUserRole(profile.role);
        const eventIds = profile.participating_events || [];

        // Fetch organized events and organizations if user is an organizer
        if (profile.role === "ORGANIZER") {
          try {
            // Fetch organizations (owned and collaborated)
            const orgsData = await getMyOrganizations();
            // Combine owned and collaborated organizations
            const allOrgs = [
              ...(orgsData.owned || []),
              ...(orgsData.collaborated || []),
            ];
            setOrganizations(allOrgs);

            // Track which organizations are owned
            const ownedIds = new Set(
              (orgsData.owned || []).map((org) => org.id),
            );
            setOwnedOrganizationIds(ownedIds);

            // Auto-select organization if only one
            if (allOrgs.length === 1) {
              setSelectedOrganizationId(String(allOrgs[0].id));
            }

            // Fetch organized events
            const organized = await getMyOrganizedEvents();
            // Group events by organization
            const grouped: OrganizedEventsByOrg = {};
            organized.forEach((event) => {
              const orgName = event.organization_name || "Unknown Organization";
              if (!grouped[orgName]) {
                grouped[orgName] = [];
              }
              grouped[orgName].push(event);
            });
            setOrganizedEvents(grouped);
          } catch (err) {
            console.error(
              "Failed to load organized events or organizations:",
              err,
            );
            // Don't fail the whole page if organized events fail
          }
        }

        // Fetch participating events
        if (eventIds.length === 0) {
          setParticipatingEvents([]);
          setLoading(false);
          return;
        }

        // Fetch each event by ID
        const eventPromises = eventIds.map(async (eventId: number) => {
          try {
            const response = await fetchWithAuth(
              `${API_BASE}/events/${eventId}/`,
              {
                method: "GET",
              },
            );

            if (!response.ok) {
              console.error(`Failed to fetch event ${eventId}`);
              return null;
            }

            return response.json();
          } catch (err) {
            console.error(`Error fetching event ${eventId}:`, err);
            return null;
          }
        });

        const eventResults = await Promise.all(eventPromises);
        // Filter out null results and sort by date
        const validEvents = eventResults
          .filter((event): event is Event => event !== null)
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        setParticipatingEvents(validEvents);
      } catch (err) {
        console.error("Failed to load events:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load your events",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [router]);

  if (!mounted || !authed || loading) {
    return (
      <div className="container mx-auto p-8 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading your events...</p>
          </CardContent>
        </Card>
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
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const renderEventCard = (event: Event) => (
    <Card
      key={event.id}
      className="hover:shadow-lg transition-shadow relative flex flex-col"
    >
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-md ${
            CATEGORY_COLORS[event.category] || "bg-gray-500 text-white"
          }`}
        >
          {event.category}
        </span>
        {event.status && (
          <span
            className={`text-white text-xs px-2 py-1 rounded-md font-semibold ${
              event.status === "Active"
                ? "bg-green-500"
                : event.status === "Cancelled" || event.status === "Canceled"
                  ? "bg-red-500"
                  : "bg-gray-500"
            }`}
          >
            {event.status}
          </span>
        )}
      </div>

      <CardHeader>
        <CardTitle className="line-clamp-2">{event.name}</CardTitle>
        <CardDescription>
          {new Date(event.date).toLocaleString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {event.location ? (
          <p className="text-sm text-muted-foreground">📍 {event.location}</p>
        ) : (
          <p className="text-sm text-muted-foreground opacity-0">
            {/* Spacer to maintain consistent height */}
            &nbsp;
          </p>
        )}
        {(event.created_by || event.organizer_name) && (
          <p className="text-sm text-muted-foreground mt-2">
            Created by {event.created_by || event.organizer_name}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSelectedEventId(String(event.id));
            setModalOpen(true);
          }}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );

  const refreshEvents = async () => {
    if (!authed) return;

    try {
      const profile = await getProfile();
      const eventIds = profile.participating_events || [];

      // Refresh organized events and organizations if organizer
      if (profile.role === "ORGANIZER") {
        try {
          // Refresh organizations
          const orgsData = await getMyOrganizations();
          const allOrgs = [
            ...(orgsData.owned || []),
            ...(orgsData.collaborated || []),
          ];
          setOrganizations(allOrgs);

          // Track which organizations are owned
          const ownedIds = new Set((orgsData.owned || []).map((org) => org.id));
          setOwnedOrganizationIds(ownedIds);

          // Refresh organized events
          const organized = await getMyOrganizedEvents();
          const grouped: OrganizedEventsByOrg = {};
          organized.forEach((event) => {
            const orgName = event.organization_name || "Unknown Organization";
            if (!grouped[orgName]) {
              grouped[orgName] = [];
            }
            grouped[orgName].push(event);
          });
          setOrganizedEvents(grouped);
        } catch (err) {
          console.error(
            "Failed to refresh organized events or organizations:",
            err,
          );
        }
      }

      // Refresh participating events
      if (eventIds.length === 0) {
        setParticipatingEvents([]);
        return;
      }

      const eventPromises = eventIds.map(async (eventId: number) => {
        try {
          const response = await fetchWithAuth(
            `${API_BASE}/events/${eventId}/`,
            {
              method: "GET",
            },
          );

          if (!response.ok) return null;
          return response.json();
        } catch {
          return null;
        }
      });

      const eventResults = await Promise.all(eventPromises);
      const validEvents = eventResults
        .filter((event): event is Event => event !== null)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

      setParticipatingEvents(validEvents);
    } catch (err) {
      console.error("Failed to refresh events:", err);
    }
  };

  const validateEventForm = () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    if (!selectedOrganizationId) {
      newErrors.organization = "Organization is required";
      hasErrors = true;
    }

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "capacity") return; // ignores empty validation
      if (typeof value === "string" && !value.trim()) {
        newErrors[key] =
          `${key.charAt(0).toUpperCase() + key.slice(1)} is required`;
        hasErrors = true;
      }
    });

    // validates if capacity is a positive number
    if (formData.capacity && Number(formData.capacity) < 0) {
      newErrors.capacity = "Capacity cannot be negative";
      hasErrors = true;
    }

    setFormErrors(newErrors);
    if (hasErrors) {
      setFormSubmitError("Please fill in all required fields");
      return false;
    }

    setFormSubmitError("");
    return true;
  };

  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateEventForm()) {
      return;
    }

    try {
      setFormSubmitting(true);
      const dataToSend = {
        ...formData,
        capacity: formData.capacity === "" ? 0 : Number(formData.capacity),
        organization: Number(selectedOrganizationId),
      };

      const response = await fetchWithAuth(`${API_BASE}/events/create/`, {
        method: "POST",
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      // Reset form
      setFormData({
        name: "",
        date: "",
        location: "",
        description: "",
        capacity: "",
        category: "",
      });
      setFormErrors({});
      setFormSubmitError("");
      setShowCreateForm(false);

      // Refresh events
      await refreshEvents();
    } catch (error) {
      setFormSubmitError("Failed to create event");
      console.error("Error creating event:", error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const organizedEventsCount = Object.values(organizedEvents).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  const hasOrganizedEvents = organizedEventsCount > 0;
  const hasParticipatingEvents = participatingEvents.length > 0;
  const hasOrganizations = organizations.length > 0;

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Events</h1>
      </div>

      {/* Section 1: Events I'm Organizing (for organizers only) */}
      {userRole === "ORGANIZER" && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Events I&apos;m Organizing
            </h2>
            {hasOrganizations && (
              <Button
                variant={showCreateForm ? "outline" : "default"}
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? "Cancel" : "Create Event"}
              </Button>
            )}
          </div>

          {showCreateForm && hasOrganizations && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-left max-w-2xl mx-auto">
                  <h3 className="text-xl font-semibold mb-4">
                    Create New Event
                  </h3>
                  <form onSubmit={handleCreateEvent}>
                    <Field className="mb-4">
                      <FieldLabel>
                        Organization <span className="text-destructive">*</span>
                      </FieldLabel>
                      <FieldContent>
                        <Select
                          value={selectedOrganizationId}
                          onValueChange={(value) => {
                            setSelectedOrganizationId(value);
                            setFormErrors({ ...formErrors, organization: "" });
                            setFormSubmitError("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={String(org.id)}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.organization && (
                          <FieldError>{formErrors.organization}</FieldError>
                        )}
                      </FieldContent>
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <Field>
                        <FieldLabel>
                          Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                name: e.target.value,
                              });
                              setFormErrors({ ...formErrors, name: "" });
                              setFormSubmitError("");
                            }}
                          />
                        </FieldContent>
                        {formErrors.name && (
                          <FieldError>{formErrors.name}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel>
                          Date and Time{" "}
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            type="datetime-local"
                            value={formData.date}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                date: e.target.value,
                              });
                              setFormErrors({ ...formErrors, date: "" });
                              setFormSubmitError("");
                            }}
                          />
                        </FieldContent>
                        {formErrors.date && (
                          <FieldError>{formErrors.date}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel>
                          Location <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            type="text"
                            value={formData.location}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                location: e.target.value,
                              });
                              setFormErrors({ ...formErrors, location: "" });
                              setFormSubmitError("");
                            }}
                          />
                        </FieldContent>
                        {formErrors.location && (
                          <FieldError>{formErrors.location}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel>
                          Category <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => {
                              setFormData({ ...formData, category: value });
                              setFormErrors({ ...formErrors, category: "" });
                              setFormSubmitError("");
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SOCIAL">Social</SelectItem>
                              <SelectItem value="ACADEMIC">Academic</SelectItem>
                              <SelectItem value="TRAVEL">Travel</SelectItem>
                              <SelectItem value="SPORTS">Sports</SelectItem>
                              <SelectItem value="CULTURAL">Cultural</SelectItem>
                              <SelectItem value="VOLUNTEERING">
                                Volunteering
                              </SelectItem>
                              <SelectItem value="NIGHTLIFE">
                                Nightlife
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldContent>
                        {formErrors.category && (
                          <FieldError>{formErrors.category}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <FieldLabel>Maximum Capacity</FieldLabel>
                        <FieldContent>
                          <Input
                            type="number"
                            placeholder="Unlimited if blank"
                            value={formData.capacity}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                capacity: e.target.value,
                              });
                              setFormErrors({ ...formErrors, capacity: "" });
                              setFormSubmitError("");
                            }}
                          />
                        </FieldContent>
                        {formErrors.capacity && (
                          <FieldError>{formErrors.capacity}</FieldError>
                        )}
                      </Field>

                      <Field className="md:col-span-2">
                        <FieldLabel>
                          Description{" "}
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldContent>
                          <textarea
                            className="w-full p-2 border rounded min-h-[100px]"
                            value={formData.description}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              });
                              setFormErrors({ ...formErrors, description: "" });
                              setFormSubmitError("");
                            }}
                          />
                        </FieldContent>
                        {formErrors.description && (
                          <FieldError>{formErrors.description}</FieldError>
                        )}
                      </Field>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <Button type="submit" disabled={formSubmitting}>
                        {formSubmitting ? "Creating..." : "Create Event"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCreateForm(false);
                          setFormData({
                            name: "",
                            date: "",
                            location: "",
                            description: "",
                            capacity: "",
                            category: "",
                          });
                          setFormErrors({});
                          setFormSubmitError("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    {formSubmitError && (
                      <FieldError className="mt-4">
                        {formSubmitError}
                      </FieldError>
                    )}
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          {hasOrganizedEvents ? (
            // Show organized events grouped by organization
            <>
              {Object.entries(organizedEvents)
                .sort(([orgA], [orgB]) => orgA.localeCompare(orgB))
                .map(([organizationName, events]) => {
                  // Get organization_id from the first event (all events in group have same org)
                  const organizationId = events[0]?.organization_id;
                  const isOwner = organizationId
                    ? ownedOrganizationIds.has(organizationId)
                    : false;
                  const isCollaborator = organizationId
                    ? !isOwner &&
                      organizations.some((org) => org.id === organizationId)
                    : false;

                  return (
                    <div key={organizationName} className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-medium text-muted-foreground">
                          {organizationId ? (
                            <Link
                              href={`/organizations/${organizationId}`}
                              className="hover:text-foreground hover:underline transition-colors"
                              onClick={() => {
                                sessionStorage.setItem(
                                  "org_detail_referrer",
                                  "/events/my",
                                );
                              }}
                            >
                              {organizationName}
                            </Link>
                          ) : (
                            organizationName
                          )}
                        </h3>
                        {isOwner && (
                          <span className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md">
                            Owner
                          </span>
                        )}
                        {isCollaborator && (
                          <span className="px-2 py-1 text-xs font-semibold text-white bg-gray-600 rounded-md">
                            Collaborator
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => renderEventCard(event))}
                      </div>
                    </div>
                  );
                })}
            </>
          ) : hasOrganizations ? (
            // No organized events but has organizations - show message
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t organized any events yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            // No organized events and no organizations
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  You are currently not part of any organization. You need to
                  create or be invited to an organization before you can
                  organize events.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/organizations/create")}
                >
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Section 2: Events I'm Participating In */}
      <div className={userRole === "ORGANIZER" ? "" : ""}>
        <h2 className="text-2xl font-semibold mb-4">
          Events I&apos;m Participating In
        </h2>

        {hasParticipatingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {participatingEvents.map((event) => renderEventCard(event))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You have not registered for any events yet.
              </p>
              <Button variant="outline" onClick={() => router.push("/events")}>
                Browse Events
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {modalOpen && selectedEventId && (
        <EventModal
          id={selectedEventId}
          onClose={() => {
            setModalOpen(false);
            setSelectedEventId(null);
            refreshEvents();
          }}
        />
      )}
    </div>
  );
}

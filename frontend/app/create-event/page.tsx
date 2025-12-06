"use client";

import { useState, useEffect, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isAuthenticated } from "@/lib/auth";
import { getProfile, type Profile } from "@/lib/profiles";
import { getMyOrganizations, type Organization } from "@/lib/organizations";
import { apiRequest } from "@/lib/utils";

// Add new component for success message with same styling as FieldError
const FieldSuccess = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm font-medium text-green-600">{children}</span>
);

function CreateEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

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
        const data = await getProfile();
        setProfile(data);

        // Check if user has ORGANIZER role
        if (data.role !== "ORGANIZER") {
          router.replace("/");
          return;
        }

        // Fetch user's organizations (owned and collaborated)
        const orgsData = await getMyOrganizations();
        // Combine owned and collaborated organizations
        const allOrgs = [
          ...(orgsData.owned || []),
          ...(orgsData.collaborated || []),
        ];
        setOrganizations(allOrgs);

        // Check if organization ID is provided in query params
        const orgIdParam = searchParams.get("organization");
        if (orgIdParam) {
          // Verify the user owns or collaborates with this organization
          const org = allOrgs.find((o) => o.id === Number(orgIdParam));
          if (org) {
            setSelectedOrganizationId(orgIdParam);
            // Store the referrer from organization page if it exists
            const orgReferrer = sessionStorage.getItem("org_detail_referrer");
            if (!orgReferrer) {
              // If no referrer stored, store the organization page as referrer
              sessionStorage.setItem(
                "org_create_event_referrer",
                `/organizations/${orgIdParam}`,
              );
            } else {
              // Store the original referrer for when we go back
              sessionStorage.setItem("org_create_event_referrer", orgReferrer);
            }
          }
        } else if (allOrgs.length === 1) {
          // If only one organization, auto-select it
          setSelectedOrganizationId(String(allOrgs[0].id));
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setSubmitError(
          "Failed to load data. Please make sure you are logged in.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, searchParams]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    if (!selectedOrganizationId) {
      newErrors.organization = "Organization is required";
      hasErrors = true;
    }

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "capacity") return; // Skip validation for capacity field as it is optional; empty means unlimited capacity
      if (typeof value === "string" && !value.trim()) {
        newErrors[key] =
          `${key.charAt(0).toUpperCase() + key.slice(1)} is required`;
        hasErrors = true;
      }
    });

    //validates if capacity is a non-negative number
    if (formData.capacity && Number(formData.capacity) < 0) {
      newErrors.capacity = "Capacity cannot be negative";
      hasErrors = true;
    }

    setErrors(newErrors);
    if (hasErrors) {
      setSubmitError("Please fill in all required fields");
      return false;
    }

    setSubmitError("");
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        capacity: formData.capacity === "" ? 0 : Number(formData.capacity),
        organization: Number(selectedOrganizationId),
      };

      await createEvent(dataToSend);
      setSuccessMessage("Event created successfully!");
      // Reset form
      setFormData({
        name: "",
        date: "",
        location: "",
        description: "",
        capacity: "",
        category: "",
      });
      // Clear any previous errors
      setErrors({});
      setSubmitError("");
      // Redirect to organization page after successful creation
      const org = organizations.find(
        (o) => o.id === Number(selectedOrganizationId),
      );
      if (org) {
        // Restore the referrer that was stored when we came from organization page
        const storedReferrer = sessionStorage.getItem(
          "org_create_event_referrer",
        );
        if (storedReferrer) {
          sessionStorage.setItem("org_detail_referrer", storedReferrer);
          sessionStorage.removeItem("org_create_event_referrer");
        }
        // Use replace to remove create event page from history
        // Navigate immediately to ensure referrer is available when component mounts
        router.replace(`/organizations/detail?id=${selectedOrganizationId}`);
      }
    } catch (error) {
      setSubmitError("Failed to create event");
      console.error("Error creating event:", error);
      setSuccessMessage("");
    }
  };

  if (!mounted || !authed || loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  if (profile?.role !== "ORGANIZER") {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only users with ORGANIZER role can create events.
            </CardDescription>
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

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

      <form onSubmit={handleSubmit}>
        <Field className="mb-4">
          <FieldLabel>
            Organization <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Select
              value={selectedOrganizationId}
              onValueChange={(value) => {
                setSelectedOrganizationId(value);
                setErrors({ ...errors, organization: "" });
                setSubmitError("");
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
            {errors.organization && (
              <FieldError>{errors.organization}</FieldError>
            )}
          </FieldContent>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <FieldContent>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setErrors({ ...errors, name: "" });
                  setSubmitError("");
                  setSuccessMessage("");
                }}
              />
            </FieldContent>
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>Date and Time</FieldLabel>
            <FieldContent>
              <Input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  setErrors({ ...errors, date: "" });
                  setSubmitError("");
                  setSuccessMessage("");
                }}
              />
            </FieldContent>
            {errors.date && <FieldError>{errors.date}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>Location</FieldLabel>
            <FieldContent>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  setErrors({ ...errors, location: "" });
                  setSubmitError("");
                  setSuccessMessage("");
                }}
              />
            </FieldContent>
            {errors.location && <FieldError>{errors.location}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>Category</FieldLabel>
            <FieldContent>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value });
                  setErrors({ ...errors, category: "" });
                  setSubmitError("");
                  setSuccessMessage("");
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
                  <SelectItem value="VOLUNTEERING">Volunteering</SelectItem>
                  <SelectItem value="NIGHTLIFE">Nightlife</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
            {errors.category && <FieldError>{errors.category}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>Maximum Capacity</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                placeholder="Unlimited if blank"
                value={formData.capacity}
                onChange={(e) => {
                  setFormData({ ...formData, capacity: e.target.value });
                  setErrors({ ...errors, capacity: "" });
                  setSubmitError("");
                  setSuccessMessage("");
                }}
              />
            </FieldContent>
            {errors.capacity && <FieldError>{errors.capacity}</FieldError>}
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel>Description</FieldLabel>
            <FieldContent>
              <textarea
                className="w-full p-2 border rounded min-h-[100px]"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  setErrors({ ...errors, description: "" });
                  setSubmitError("");
                  setSuccessMessage("");
                }}
              />
            </FieldContent>
            {errors.description && (
              <FieldError>{errors.description}</FieldError>
            )}
          </Field>
        </div>

        <Button type="submit" className="mt-6">
          Create Event
        </Button>

        <div className="mt-4">
          {submitError && <FieldError>{submitError}</FieldError>}
          {successMessage && <FieldSuccess>{successMessage}</FieldSuccess>}
        </div>
      </form>
    </div>
  );
}

export default function CreateEvent() {
  return (
    <Suspense
      fallback={<div className="container mx-auto p-6">Loading...</div>}
    >
      <CreateEventContent />
    </Suspense>
  );
}

export const createEvent = async (eventData: {
  name: string;
  date: string;
  location: string;
  description: string;
  capacity: string | number;
  category: string;
  organization: number;
}) => {
  const response = await apiRequest("events/create/", "POST", eventData);

  if (!response.ok) {
    throw new Error("Failed to create event");
  }

  return response.json();
};

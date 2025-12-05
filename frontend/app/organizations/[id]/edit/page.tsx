"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  type Organization,
  type UpdateOrganizationPayload,
  type OrganizationType,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isOwner, setIsOwner] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [organizationType, setOrganizationType] = useState<string>("");
  const [establishedDate, setEstablishedDate] = useState("");

  useEffect(() => {
    setMounted(true);
    const authenticated = isAuthenticated();
    setAuthed(authenticated);

    if (!authenticated) {
      router.replace("/profile/login");
      return;
    }

    // Store referrer when coming from detail page to edit page
    // This allows us to preserve the original referrer when going back
    if (typeof window !== "undefined") {
      const currentReferrer = sessionStorage.getItem("org_detail_referrer");
      if (currentReferrer) {
        sessionStorage.setItem("org_edit_referrer", currentReferrer);
      }
    }

    if (isNaN(id)) {
      setError("Invalid organization ID");
      setLoading(false);
      return;
    }

    const fetchOrganization = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgData = await getOrganization(id);

        // Check if user is owner
        if (!("owner_id" in orgData)) {
          setError("You don't have permission to edit this organization");
          setLoading(false);
          return;
        }

        setIsOwner(true);
        setOrganization(orgData);
        setName(orgData.name);
        setDescription(orgData.description || "");
        setEmail(orgData.email || "");
        setWebsite(orgData.website || "");
        setPhone(orgData.phone || "");
        setAddress(orgData.address || "");
        setCity(orgData.city || "");
        setCountry(orgData.country || "");
        setLogoUrl(orgData.logo_url || "");
        setCoverImageUrl(orgData.cover_image_url || "");
        setTwitterHandle(orgData.twitter_handle || "");
        setFacebookUrl(orgData.facebook_url || "");
        setLinkedinUrl(orgData.linkedin_url || "");
        setInstagramHandle(orgData.instagram_handle || "");
        setOrganizationType(orgData.organization_type || "");
        setEstablishedDate(
          orgData.established_date
            ? new Date(orgData.established_date).toISOString().split("T")[0]
            : "",
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load organization",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [router, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFormErrors({});

    if (!name.trim()) {
      setFormErrors({ name: "Name is required" });
      setSaving(false);
      return;
    }

    const payload: UpdateOrganizationPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
      cover_image_url: coverImageUrl.trim() || undefined,
      twitter_handle: twitterHandle.trim() || undefined,
      facebook_url: facebookUrl.trim() || undefined,
      linkedin_url: linkedinUrl.trim() || undefined,
      instagram_handle: instagramHandle.trim() || undefined,
      organization_type: (organizationType as OrganizationType) || undefined,
      established_date: establishedDate || undefined,
    };

    try {
      const updated = await updateOrganization(id, payload);
      // Preserve the referrer when navigating to detail page after edit
      const referrer =
        sessionStorage.getItem("org_detail_referrer") ||
        sessionStorage.getItem("org_edit_referrer");
      if (referrer) {
        sessionStorage.setItem("org_detail_referrer", referrer);
      }
      // Use replace instead of push to remove edit page from history
      router.replace(`/organizations/${updated.id}`);
    } catch (err) {
      if (err && typeof err === "object") {
        // Handle validation errors from backend
        const errorMessages: Record<string, string> = {};
        const errRecord = err as Record<string, unknown>;
        Object.keys(errRecord).forEach((key) => {
          const value = errRecord[key];
          if (Array.isArray(value)) {
            errorMessages[key] = value[0];
          } else if (typeof value === "string") {
            errorMessages[key] = value;
          }
        });
        setFormErrors(errorMessages);
        setError("Please fix the errors below");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to update organization",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this organization? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteOrganization(id);
      router.push("/organizations");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete organization",
      );
      setDeleting(false);
    }
  };

  if (!mounted || !authed || loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !isOwner) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => router.push(`/organizations/${id}`)}
            >
              Back to Organization
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Organization not found</CardDescription>
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

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
          <CardDescription>
            Update your organization information. Only the owner can edit.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            {error && !Object.keys(formErrors).length && (
              <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md">
                {error}
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    data-invalid={!!formErrors.name}
                  />
                  <FieldError
                    errors={
                      formErrors.name
                        ? [{ message: formErrors.name }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <FieldContent>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                  <FieldDescription>
                    A brief description of your organization
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="organization_type">
                  Organization Type
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={organizationType || undefined}
                    onValueChange={(value) =>
                      setOrganizationType(
                        value === "NOT_SPECIFIED" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger id="organization_type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_SPECIFIED">
                        Not specified
                      </SelectItem>
                      <SelectItem value="COMPANY">Company</SelectItem>
                      <SelectItem value="NON_PROFIT">Non-profit</SelectItem>
                      <SelectItem value="COMMUNITY">Community</SelectItem>
                      <SelectItem value="EDUCATIONAL">Educational</SelectItem>
                      <SelectItem value="GOVERNMENT">Government</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-invalid={!!formErrors.email}
                  />
                  <FieldError
                    errors={
                      formErrors.email
                        ? [{ message: formErrors.email }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="website">Website</FieldLabel>
                <FieldContent>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    data-invalid={!!formErrors.website}
                  />
                  <FieldError
                    errors={
                      formErrors.website
                        ? [{ message: formErrors.website }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <FieldContent>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    data-invalid={!!formErrors.phone}
                  />
                  <FieldError
                    errors={
                      formErrors.phone
                        ? [{ message: formErrors.phone }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <FieldContent>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    data-invalid={!!formErrors.address}
                  />
                  <FieldError
                    errors={
                      formErrors.address
                        ? [{ message: formErrors.address }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <FieldContent>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-invalid={!!formErrors.city}
                  />
                  <FieldError
                    errors={
                      formErrors.city
                        ? [{ message: formErrors.city }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="country">Country</FieldLabel>
                <FieldContent>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    data-invalid={!!formErrors.country}
                  />
                  <FieldError
                    errors={
                      formErrors.country
                        ? [{ message: formErrors.country }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="logo_url">Logo URL</FieldLabel>
                <FieldContent>
                  <Input
                    id="logo_url"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    data-invalid={!!formErrors.logo_url}
                  />
                  <FieldError
                    errors={
                      formErrors.logo_url
                        ? [{ message: formErrors.logo_url }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="cover_image_url">
                  Cover Image URL
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="cover_image_url"
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    data-invalid={!!formErrors.cover_image_url}
                  />
                  <FieldError
                    errors={
                      formErrors.cover_image_url
                        ? [{ message: formErrors.cover_image_url }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="twitter_handle">Twitter Handle</FieldLabel>
                <FieldContent>
                  <Input
                    id="twitter_handle"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    placeholder="@username"
                    data-invalid={!!formErrors.twitter_handle}
                  />
                  <FieldError
                    errors={
                      formErrors.twitter_handle
                        ? [{ message: formErrors.twitter_handle }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="facebook_url">Facebook URL</FieldLabel>
                <FieldContent>
                  <Input
                    id="facebook_url"
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/..."
                    data-invalid={!!formErrors.facebook_url}
                  />
                  <FieldError
                    errors={
                      formErrors.facebook_url
                        ? [{ message: formErrors.facebook_url }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="linkedin_url">LinkedIn URL</FieldLabel>
                <FieldContent>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                    data-invalid={!!formErrors.linkedin_url}
                  />
                  <FieldError
                    errors={
                      formErrors.linkedin_url
                        ? [{ message: formErrors.linkedin_url }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="instagram_handle">
                  Instagram Handle
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="instagram_handle"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@username"
                    data-invalid={!!formErrors.instagram_handle}
                  />
                  <FieldError
                    errors={
                      formErrors.instagram_handle
                        ? [{ message: formErrors.instagram_handle }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="established_date">
                  Established Date
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="established_date"
                    type="date"
                    value={establishedDate}
                    onChange={(e) => setEstablishedDate(e.target.value)}
                    data-invalid={!!formErrors.established_date}
                  />
                  <FieldError
                    errors={
                      formErrors.established_date
                        ? [{ message: formErrors.established_date }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex gap-2 justify-between mt-6">
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Organization"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

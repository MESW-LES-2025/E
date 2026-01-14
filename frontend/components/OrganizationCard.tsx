"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  followOrganization,
  unfollowOrganization,
  type PublicOrganization,
} from "@/lib/organizations";
import { isAuthenticated } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OrganizationCardProps {
  organization: PublicOrganization;
  referrer?: string;
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

export default function OrganizationCard({
  organization,
  referrer,
}: OrganizationCardProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(
    organization.is_following || false,
  );
  const [followLoading, setFollowLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
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

  // Update following state when organization prop changes
  useEffect(() => {
    setIsFollowing(organization.is_following || false);
  }, [organization.id, organization.is_following]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is authenticated
    if (!isAuthenticated()) {
      sessionStorage.setItem("login_redirect", window.location.pathname);
      router.push("/profile/login");
      return;
    }

    try {
      setFollowLoading(true);
      if (isFollowing) {
        await unfollowOrganization(organization.id);
        setIsFollowing(false);
      } else {
        await followOrganization(organization.id);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update follow status. Please try again.",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCardClick = () => {
    if (referrer) {
      sessionStorage.setItem("org_detail_referrer", referrer);
    }
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-xl font-bold group-hover:text-primary transition-colors">
          {organization.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-medium">
            {getOrganizationTypeLabel(organization.organization_type)}
          </Badge>
          {organization.event_count > 0 && (
            <span className="text-sm">
              {organization.event_count} event
              {organization.event_count !== 1 ? "s" : ""}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {organization.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {organization.description}
          </p>
        )}
        <div className="space-y-1">
          {organization.city && organization.country && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {organization.city}, {organization.country}
            </p>
          )}
          {organization.owner_name && (
            <p className="text-sm text-muted-foreground">
              By {organization.owner_name}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-4">
        <Button variant="default" className="w-full font-semibold" asChild>
          <Link
            href={`/organizations/detail?id=${organization.id}`}
            onClick={handleCardClick}
          >
            View Details
          </Link>
        </Button>
        {userRole === "ATTENDEE" && (
          <Button
            variant={isFollowing ? "outline" : "secondary"}
            size="sm"
            onClick={handleFollowToggle}
            disabled={followLoading}
            className="w-full group relative"
          >
            <span className={isFollowing ? "group-hover:hidden" : ""}>
              {followLoading
                ? "Loading..."
                : isFollowing
                  ? "Following"
                  : "Follow"}
            </span>
            {isFollowing && !followLoading && (
              <span className="hidden group-hover:inline">Unfollow</span>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import { getProfile, type Profile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { getUnreadCount } from "@/lib/notifications";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    const checkAuth = async () => {
      // First check if user is authenticated before making any API calls
      const isAuth = isAuthenticated();
      setAuthed(isAuth);

      // Only fetch profile if user is authenticated
      if (isAuth) {
        try {
          const profileData = await getProfile();
          setProfile(profileData);
        } catch (err) {
          console.error("Failed to load profile:", err);
          // If profile fetch fails (token expired/invalid), clear auth state
          const errorMessage = err instanceof Error ? err.message : "";
          if (
            errorMessage.includes("token") ||
            errorMessage.includes("not valid") ||
            errorMessage.includes("authentication") ||
            errorMessage.includes("Session expired")
          ) {
            // Token is invalid, clear it and redirect to login
            logout();
            setAuthed(false);
            setProfile(null);
            // Only redirect if not already on login page
            if (pathname !== "/profile/login") {
              router.push("/profile/login");
            }
          } else {
            // Other error, just don't set profile
            setAuthed(false);
          }
        }

        // Fetch unread notifications count
        try {
          const count = await getUnreadCount();
          setUnread(count);
        } catch {
          setUnread(0);
        }
      } else {
        // User is not authenticated, ensure profile is null
        setProfile(null);
        setUnread(0);
      }

      setLoading(false);
    };

    checkAuth();
  }, [pathname, router]); // Re-check when route changes

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setProfile(null);
    setUnread(0);
    router.push("/profile/login");
  };

  const isOrganizer = profile?.role === "ORGANIZER";

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <Link href="/">
        <h1 className="text-2xl font-bold cursor-pointer">Erasmus in Porto</h1>
      </Link>
      <nav className="flex gap-4">
        <Link href="/">
          <Button variant="ghost">Home</Button>
        </Link>

        {loading ? (
          <Button variant="ghost" disabled>
            Loading...
          </Button>
        ) : authed ? (
          <>
            <Link href="/calendar">
              <Button variant="ghost">Calendar</Button>
            </Link>

            {isOrganizer && (
              <Link href="/organizations/my">
                <Button variant="ghost">My Organizations</Button>
              </Link>
            )}

            <Link href="/events/my">
              <Button variant="ghost">My Events</Button>
            </Link>

            <Link href="/profile">
              <Button variant="ghost">My Profile</Button>
            </Link>

            <Link href="/notifications" className="relative">
              <Button variant="ghost" className="relative">
                {/* Simple bell glyph */}
                <span className="mr-2">🔔</span>
                Notifications
                {unread > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                    {unread}
                  </span>
                )}
              </Button>
            </Link>

            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link href="/calendar">
              <Button variant="ghost">Calendar</Button>
            </Link>
            <Link href="/profile/register">
              <Button variant="ghost">Register</Button>
            </Link>
            <Link href="/profile/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

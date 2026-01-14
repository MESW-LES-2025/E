"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import { getProfile, type Profile } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Menu,
  X,
  Bell,
  User,
  ChevronDown,
  Calendar,
  Building2,
  LogOut,
} from "lucide-react";
import {
  getFilteredUnreadCount,
  registerNotificationRefreshCallback,
} from "@/lib/notifications";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState<number>(0);
  const fetchUnreadCount = useCallback(async () => {
    const storedPreference = localStorage.getItem("remindersEnabled");
    const currentRemindersEnabled =
      storedPreference === null ? true : JSON.parse(storedPreference);

    try {
      const count = await getFilteredUnreadCount(currentRemindersEnabled);
      setUnread(count);
    } catch {
      setUnread(0);
    }
  }, []);

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
        await fetchUnreadCount();

        registerNotificationRefreshCallback(fetchUnreadCount);
      } else {
        // User is not authenticated, ensure profile is null
        setProfile(null);
        setUnread(0);
      }

      setLoading(false);
    };

    checkAuth();

    return () => {
      registerNotificationRefreshCallback(() => {});
    };
  }, [pathname, router, fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setProfile(null);
    setUnread(0);
    router.push("/profile/login");
  };

  const isOrganizer = profile?.role === "ORGANIZER";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                Erasmus in Porto
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Discover Events in Porto&apos;s Erasmus Community
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Main Navigation Links - Always Visible */}
            <Link href="/">
              <Button
                variant="ghost"
                className="hover:bg-primary/20 hover:text-primary transition-colors"
              >
                Home
              </Button>
            </Link>
            <Link href="/events">
              <Button
                variant="ghost"
                className="hover:bg-primary/20 hover:text-primary transition-colors"
              >
                Events
              </Button>
            </Link>
            <Link href="/organizations">
              <Button
                variant="ghost"
                className="hover:bg-primary/20 hover:text-primary transition-colors"
              >
                Organizations
              </Button>
            </Link>
            <Link href="/calendar">
              <Button
                variant="ghost"
                className="hover:bg-primary/20 hover:text-primary transition-colors"
              >
                Calendar
              </Button>
            </Link>

            {/* User Menu / Auth Buttons */}
            {loading ? (
              <Button variant="ghost" disabled className="ml-2">
                Loading...
              </Button>
            ) : authed ? (
              <>
                {/* User Account Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="hover:bg-primary/20 hover:text-primary transition-colors ml-2"
                    >
                      <span className="hidden lg:inline">
                        {profile?.first_name || "Account"}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="space-y-1">
                      <Link href="/events/my">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          My Events
                        </Button>
                      </Link>
                      {isOrganizer && (
                        <Link href="/organizations/my">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            My Organizations
                          </Button>
                        </Link>
                      )}
                      <Link href="/profile">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                      </Link>
                      <Link href="/notifications">
                        <Button
                          variant="ghost"
                          className="w-full justify-start relative"
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Notifications
                          {unread > 0 && (
                            <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </Button>
                      </Link>
                      <div className="border-t my-1"></div>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <ThemeToggle />
              </>
            ) : (
              <>
                <Link href="/profile/register" className="ml-2">
                  <Button
                    variant="outline"
                    className="hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    Register
                  </Button>
                </Link>
                <Link href="/profile/login">
                  <Button className="bg-primary hover:bg-primary/90">
                    Sign In
                  </Button>
                </Link>
                <ThemeToggle />
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            {/* Main Navigation Links */}
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Home
              </Button>
            </Link>
            <Link href="/events" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Events
              </Button>
            </Link>
            <Link
              href="/organizations"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start">
                Organizations
              </Button>
            </Link>
            <Link href="/calendar" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Calendar
              </Button>
            </Link>

            {/* User Section Separator */}
            {!loading && authed && <div className="border-t my-2"></div>}

            {loading ? (
              <Button variant="ghost" disabled className="w-full justify-start">
                Loading...
              </Button>
            ) : authed ? (
              <>
                {/* User Account Links */}
                <Link
                  href="/events/my"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="ghost" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    My Events
                  </Button>
                </Link>
                {isOrganizer && (
                  <Link
                    href="/organizations/my"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="ghost" className="w-full justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      My Organizations
                    </Button>
                  </Link>
                )}
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative block"
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start relative"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    {unread > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Button>
                </Link>
                <div className="border-t my-2"></div>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/profile/register"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="outline" className="w-full justify-start">
                    Register
                  </Button>
                </Link>
                <Link
                  href="/profile/login"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full justify-start bg-primary">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

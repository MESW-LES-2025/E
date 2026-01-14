"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(2024); // Default year, will update after mount
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set current year after mount to avoid hydration issues
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      setAuthed(isAuth);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    logout();
    setAuthed(false);
    router.push("/profile/login");
  };

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Erasmus in Porto
              </h2>
            </Link>
            <p className="text-sm text-muted-foreground">
              Connecting international students with amazing events and
              organizations in Porto
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/events"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/organizations"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Organizations
                </Link>
              </li>
              <li>
                <Link
                  href="/calendar"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Calendar
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold mb-4">Account</h3>
            {!loading && (
              <ul className="space-y-2">
                {authed ? (
                  <>
                    <li>
                      <Link
                        href="/profile"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Profile
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/events/my"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        My Events
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
                      >
                        Logout
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link
                        href="/profile/login"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/profile/register"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Register
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            )}
          </div>

          {/* Contact & Info */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li>
                <p className="text-sm text-muted-foreground">Porto, Portugal</p>
              </li>
              <li>
                <p className="text-sm text-muted-foreground">
                  For Erasmus students
                </p>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Learn More
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Erasmus in Porto. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/events"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Events
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/organizations"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Organizations
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

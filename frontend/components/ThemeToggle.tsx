"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const getInitialTheme = (): "light" | "dark" => {
      try {
        const stored = localStorage.getItem("theme");
        if (stored === "dark" || stored === "light") {
          return stored;
        }
        // If no stored preference, use system preference
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        return prefersDark ? "dark" : "light";
      } catch {
        return "light";
      }
    };

    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (!mounted || theme === null) return;

    const root = document.documentElement;

    // Disable transitions during theme change
    root.classList.add("theme-transitioning");

    // Apply theme change
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Re-enable transitions after a brief delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-transitioning");
      });
    });
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {
      console.error("Failed to save theme preference:", e);
    }
  };

  // Show loading state until mounted
  if (!mounted || theme === null) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-9 h-9 hover:bg-accent transition-colors"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}

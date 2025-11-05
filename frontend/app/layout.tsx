import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import "./globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {/* Navigation */}
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Erasmus in Porto</h1>
          <nav className="flex gap-4">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost">Profile</Button>
            </Link>
            <Link href="/profile/register">
              <Button variant="ghost">Register</Button>
            </Link>
            <Link href="/profile/login">
              <Button variant="ghost">Login</Button>
            </Link>
          </nav>
        </header>

        {/* Main content */}
        <main className="container mx-auto p-8">{children}</main>
      </body>
    </html>
  );
}

import Link from "next/link";
import "./globals.css";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div>
          <header>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/profile">Profile</Link>
              <Link href="/profile/register">Register</Link>
              <Link href="/profile/login">Login</Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

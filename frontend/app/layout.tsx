import React from "react";
import Navbar from "@/components/Navbar";
import "./globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {/* Navigation */}
        <Navbar />

        {/* Main content */}
        <main>{children}</main>
      </body>
    </html>
  );
}

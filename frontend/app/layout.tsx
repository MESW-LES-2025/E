import React from "react";
import Navbar from "@/components/Navbar";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import "./globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <WebSocketProvider>
          {/* Navigation */}
          <Navbar />

          {/* Main content */}
          <main>{children}</main>
        </WebSocketProvider>
      </body>
    </html>
  );
}

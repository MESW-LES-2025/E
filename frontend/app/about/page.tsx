"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth";

export default function AboutPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      setAuthed(isAuth);
      setLoading(false);
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                About Erasmus in Porto
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Your gateway to connecting with the vibrant Erasmus community in
              Porto
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
        <div className="space-y-16">
          {/* Mission Section */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-muted-foreground">
                  Erasmus in Porto is dedicated to helping international
                  students discover and participate in amazing events throughout
                  the city. We believe that the best way to experience Porto is
                  through community connections and shared experiences.
                </p>
                <p className="text-muted-foreground">
                  Our platform connects Erasmus students with local
                  organizations, cultural events, social gatherings, and
                  educational activities that make studying abroad an
                  unforgettable experience.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* What is Erasmus in Porto */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              What is Erasmus in Porto?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>For Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Discover events happening around Porto, express interest in
                    activities you&apos;d like to attend, and participate in
                    events organized by local organizations. Connect with fellow
                    Erasmus students and make the most of your time in Porto.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>For Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Create and manage events for the Erasmus community. Build
                    your organization&apos;s presence, collaborate with other
                    organizers, and reach international students looking for
                    meaningful experiences in Porto.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* How It Works */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">1️⃣</span>
                    <span>Discover</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Browse through upcoming events, filter by category or date,
                    and explore organizations creating amazing experiences in
                    Porto.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">2️⃣</span>
                    <span>Connect</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Follow organizations you love, express interest in events,
                    and participate in activities that match your interests and
                    schedule.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">3️⃣</span>
                    <span>Experience</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Attend events, meet new people, explore Porto&apos;s
                    culture, and create unforgettable memories during your
                    Erasmus journey.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Community Section */}
          <section>
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="text-3xl">Join Our Community</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-muted-foreground">
                  Whether you&apos;re a student looking for your next adventure
                  or an organization wanting to reach the Erasmus community,
                  we&apos;re here to help you connect.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {!loading && (
                    <>
                      {authed ? (
                        <Button asChild size="lg">
                          <Link href="/profile">Go to Profile</Link>
                        </Button>
                      ) : (
                        <Button asChild size="lg">
                          <Link href="/profile/register">Get Started</Link>
                        </Button>
                      )}
                    </>
                  )}
                  <Button asChild variant="outline" size="lg">
                    <Link href="/events">Explore Events</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

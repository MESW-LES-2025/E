"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import TestComponent from "../../components/TestComponent";

export default function ProfilePage() {
  const router = useRouter();

  // Evaluate once on mount
  const [authed] = useState(() => isAuthenticated());

  useEffect(() => {
    if (!authed) {
      router.replace("/profile/login");
    }
  }, [authed, router]);

  if (!authed) return <div className="p-6">A carregar...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Perfil</h1>
      <p>Autenticado.</p>
      <Button
        variant="secondary"
        onClick={() => {
          logout();
          router.push("/profile/login");
        }}
      >
        Sair
      </Button>
      <TestComponent />
      {/* <TestComponent2 /> */}
    </div>
  );
}

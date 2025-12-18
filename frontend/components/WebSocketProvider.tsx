"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websockets";
import { getUserId } from "@/lib/auth";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await getUserId();
      setUserId(id);
    };
    fetchUserId();
  }, [pathname]);

  useEffect(() => {
    if (userId) {
      connectWebSocket(userId);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [userId]);

  return (
    <>
      <Toaster />
      {children}
    </>
  );
}

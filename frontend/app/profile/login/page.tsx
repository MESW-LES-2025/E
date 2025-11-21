"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAuthenticated, login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      router.push("/profile");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha no login";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/profile");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Iniciar sessão</h1>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <FieldContent>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <FieldContent>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </FieldContent>
          </Field>

          {error && <FieldError>{error}</FieldError>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "A entrar..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-4 text-sm text-gray-600 text-center">
          <span>Don&apos;t have an account? </span>
          <Link
            href="/profile/register"
            className="text-blue-600 hover:underline"
          >
            Register now
          </Link>
        </div>

        <div className="my-4">
          <Separator />
        </div>

        <div className="mt-2 text-md text-center">
          <Link href="/" className="text-blue-600 hover:underline">
            Enter as visitor
          </Link>
        </div>
      </div>
    </div>
  );
}

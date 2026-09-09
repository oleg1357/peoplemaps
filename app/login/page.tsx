"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { PageMeta } from "@/components/PageMeta";
import { AuthShell } from "@/components/AuthShell";
import { IconGoogle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const { login, loginWithGoogle, authError, usingSupabase } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [error, setError] = useState("");

  const effectiveError = authError || error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const res = login(email, userPassword);
    if (!res.ok) {
      setError(res.message);
    } else if (!usingSupabase) {
      router.push("/");
    }
  };

  return (
    <>
      <PageMeta title="Log in — PeopleMaps" description="Log in to PeopleMaps to rate spots, save favourites and add places to the map." noIndex />
      <AuthShell title="Log in">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
            />
          </div>
          {effectiveError && (
            <p className="text-sm text-destructive">{effectiveError}</p>
          )}
          <Button type="submit" className="mt-1 w-full">
            Log in
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" />
          or
          <Separator className="flex-1" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setError("");
            loginWithGoogle();
          }}
        >
          <IconGoogle /> Continue with Google
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => router.push("/signup")}
        >
          Don&apos;t have an account yet? Sign up!
        </Button>
      </AuthShell>
    </>
  );
}
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

export default function SignupPage() {
  const { signup, loginWithGoogle, authError, usingSupabase } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [error, setError] = useState("");

  const effectiveError = authError || error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const res = signup(firstName, lastName, email, userPassword);
    if (!res.ok) {
      setError(res.message);
    } else if (!usingSupabase) {
      router.push("/");
    }
  };

  return (
    <>
      <PageMeta title="Create profile — PeopleMaps" description="Create a free PeopleMaps profile to rate spots, save favourites and add places." noIndex />
      <AuthShell title="Create profile">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-first-name">First name</Label>
            <Input
              id="signup-first-name"
              type="text"
              autoComplete="given-name"
              placeholder="Ada"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-last-name">Last name</Label>
            <Input
              id="signup-last-name"
              type="text"
              autoComplete="family-name"
              placeholder="Lovelace"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
            />
          </div>
          {effectiveError && (
            <p className="text-sm text-destructive">{effectiveError}</p>
          )}
          <Button type="submit" className="mt-1 w-full">
            Sign up
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
          onClick={() => router.push("/login")}
        >
          Already have an account? Log in
        </Button>
      </AuthShell>
    </>
  );
}
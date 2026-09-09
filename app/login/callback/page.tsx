"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginCallback() {
  const router = useRouter();

  useEffect(() => {
    // The middleware exchanges the OAuth code for a session cookie and sets
    // the supabase.auth.token cookie chain. Redirect home where the
    // AuthContext hydrates the session.
    router.replace("/");
  }, [router]);

  return (
    <div className="page">
      <div className="flex h-full items-center justify-center px-4">
        <Card className="w-full max-w-[375px] shadow-lg">
          <CardHeader className="items-center pt-6">
            <CardTitle>Signing you in…</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-center text-sm text-muted-foreground">
              One moment
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
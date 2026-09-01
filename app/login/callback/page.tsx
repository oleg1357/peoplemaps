"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
      <div className="sign-box" style={{ margin: "0 auto", maxWidth: 360 }}>
        <div className="signin auth-card">
          <h2>Signing you in…</h2>
          <p style={{ color: "var(--muted)", textAlign: "center" }}>One moment</p>
        </div>
      </div>
    </div>
  );
}

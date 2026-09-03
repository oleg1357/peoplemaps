"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { IconMapMarker, IconPlus } from "@/components/icons";
import { PeopleMapsLogo } from "@/components/Logo";
import { PageMeta } from "@/components/PageMeta";

export default function LoginPage() {
  const { login, loginWithGoogle, authError, usingSupabase } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [error, setError] = useState("");

  const effectiveError = authError || error;

  const submit = () => {
    setError("");
    const res = login(email, userPassword);
    if (!res.ok) {
      setError(res.message);
    } else if (!usingSupabase) {
      router.push("/");
    }
  };

  const google = () => {
    setError("");
    loginWithGoogle();
  };

  return (
    <div className="page">
      <PageMeta title="Log in — PeopleMaps" description="Log in to PeopleMaps to rate spots, save favourites and add places to the map." noIndex />
      <div className="flex auth-layout" style={{ height: "100%" }}>
        <div className="sign-box">
          <div className="signin auth-card">
            <h2>Log in</h2>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
            />
            {effectiveError && <p className="auth-error">{effectiveError}</p>}
            <div>
              <button className="action-btn" onClick={submit}>
                Log in
              </button>
            </div>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <div>
              <button className="action-btn2 google-btn" onClick={google}>
                Continue with Google
              </button>
            </div>
            <div>
              <button
                className="action-btn2"
                onClick={() => router.push("/signup")}
              >
                Don&apos;t have an account yet? Sign up!
              </button>
            </div>
          </div>
        </div>
        <div className="singin-image">
          <div className="flex" style={{ justifyContent: "center" }}>
            <PeopleMapsLogo size={130} />
          </div>
          <div className="flex" style={{ justifyContent: "center" }}>
            <IconMapMarker size={60} color="#2986ce" />
            <IconPlus size={60} color="#00b464" />
            <IconMapMarker size={60} color="#F94848" />
          </div>
          <img
            id="auth-image"
            src="/pin-3.png"
            alt="PeopleMaps map pin"
          />
        </div>
      </div>
    </div>
  );
}

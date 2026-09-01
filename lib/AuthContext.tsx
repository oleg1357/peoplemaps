"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getLoggedInUserId,
  clearLoggedInUser,
  setLoggedInUser,
  signup as doSignup,
  login as doLogin,
  getUser,
  getNewSpotsSince,
  getWatchAlerts,
  markWatchAlertsNotified,
} from "./store";
import { supabase, supabaseConfigured } from "./supabase";
import type { User } from "./data";

interface AuthContextValue {
  user: User | null;
  userId: string | null;
  login: (email: string, password: string) => { ok: boolean; message: string };
  signup: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => { ok: boolean; message: string };
  loginWithGoogle: () => { ok: boolean; message: string };
  authError: string | null;
  logout: () => void;
  usingSupabase: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_ONLY = ["/login", "/signup"];
const PROTECTED = ["/profile"];

// Minimal shape used across the app for a signed-in user.
function supabaseUserToAppUser(sbUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
} | null): User | null {
  if (!sbUser) return null;
  const md: Record<string, unknown> = sbUser.user_metadata || {};
  return {
    id: sbUser.id,
    email: sbUser.email,
    firstName:
      typeof md.first_name === "string"
        ? md.first_name
        : typeof md.email === "string"
          ? md.email
          : "User",
    lastName: typeof md.last_name === "string" ? md.last_name : "",
  } as unknown as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserIdState] = useState<string | null>(null);
  const [sbUserId, setSbUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const usingSupabase = supabaseConfigured;

  // Hydrate demo (localStorage) user.
  useEffect(() => {
    setUserIdState(getLoggedInUserId());
    setHydrated(true);
  }, []);

  // Hydrate Supabase session if configured.
  useEffect(() => {
    if (!usingSupabase) return;
    supabase!.auth.getSession().then(({ data }) => {
      setSbUserId(data.session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((_event, session) => {
      setSbUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [usingSupabase]);

  const activeUserId = usingSupabase ? sbUserId : userId;

  useEffect(() => {
    if (!hydrated || !pathname) return;
    const isGuestOnly = GUEST_ONLY.includes(pathname);
    const isProtected = PROTECTED.includes(pathname);
    if (isGuestOnly && activeUserId) {
      router.replace("/");
    } else if (isProtected && !activeUserId) {
      router.replace("/notfound");
    }
  }, [hydrated, activeUserId, pathname, router]);

  const demoUser = useMemo(() => getUser(userId), [userId]);

  const login = useCallback<AuthContextValue["login"]>((email, password) => {
    if (usingSupabase) {
      supabase!.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
        if (error) {
          setAuthError(error.message);
        } else if (data.session) {
          setSbUserId(data.session.user.id);
          router.push("/");
        }
      });
      return { ok: true, message: "Signing in…" };
    }
    const res = doLogin(email, password);
    if (res.ok && res.userId) {
      setUserIdState(String(res.userId));
    }
    return res;
  }, [usingSupabase, router]);

  const signup = useCallback<AuthContextValue["signup"]>((firstName, lastName, email, password) => {
    if (usingSupabase) {
      supabase!.auth
        .signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}`.trim() },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })
        .then(({ data, error }) => {
          if (error) {
            setAuthError(error.message);
            return;
          }
          if (data.session) {
            // Confirmation disabled → a session is returned immediately, so the
            // user is signed in right after registration.
            setSbUserId(data.session.user.id);
            router.push("/");
            return;
          }
          // Confirmation still enabled → attempt a direct sign-in anyway.
          supabase!.auth.signInWithPassword({ email, password }).then(({ data: loginData, error: loginErr }) => {
            if (!loginErr && loginData.session) {
              setSbUserId(loginData.session.user.id);
              router.push("/");
            } else {
              setAuthError("Please confirm your email, then log in.");
            }
          });
        });
      return { ok: true, message: "Creating your account…" };
    }
    const res = doSignup(firstName, lastName, email, password);
    if (res.ok) {
      setUserIdState(getLoggedInUserId());
    }
    return res;
  }, [usingSupabase, router]);

  const loginWithGoogle = useCallback<AuthContextValue["loginWithGoogle"]>(() => {
    if (!usingSupabase) {
      return { ok: false, message: "Google login is unavailable in demo mode." };
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    supabase!.auth
      .signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/login/callback`,
        },
      })
      .then(({ error }) => {
        if (error) {
          setAuthError(error.message || "Google login failed. Please try again.");
        }
      });
    return { ok: true, message: "Redirecting to Google…" };
  }, [usingSupabase]);

  const logout = useCallback(() => {
    if (usingSupabase) {
      supabase!.auth.signOut();
      setSbUserId(null);
    }
    clearLoggedInUser();
    setUserIdState(null);
    router.push("/about");
  }, [usingSupabase, router]);

  const value: AuthContextValue = useMemo(
    () => ({
      user: usingSupabase ? supabaseUserToAppUser(sbUserId ? { id: sbUserId } : null) : demoUser,
      userId: activeUserId,
      login,
      signup,
      loginWithGoogle,
      authError,
      logout,
      usingSupabase,
    }),
    [usingSupabase, sbUserId, demoUser, activeUserId, login, signup, loginWithGoogle, authError, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useNotificationSync() {
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "denied" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    const lastVisited = window.localStorage.getItem("peoplemaps_lastVisited");
    const count = getNewSpotsSince(lastVisited);
    if (count > 0 && Notification.permission === "granted") {
      new Notification(`${count} new spot${count === 1 ? "" : "s"} added`, {
        body: "Since your last visit!",
      });
    }
    const alerts = getWatchAlerts();
    alerts.forEach((a) => {
      if (Notification.permission === "granted") {
        new Notification(`${a.reviewAuthor} added a review`, {
          body: `"${a.spotName}" you're watching`,
        });
      }
    });
    if (alerts.length > 0) markWatchAlertsNotified();
    window.localStorage.setItem("peoplemaps_lastVisited", new Date().toISOString().slice(0, 10));
  }, []);
}

export { setLoggedInUser };

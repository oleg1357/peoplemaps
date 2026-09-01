"use client";

import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

// MapProvider is intentionally NOT global: it loads every public map (and the
// selected map's data) from Sanity, which is only needed on the map routes.
// Scope it there so /about, /login, /profile, /admin etc. make no map fetch.
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
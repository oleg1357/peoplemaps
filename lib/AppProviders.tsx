"use client";

import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { MapProvider } from "./MapContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MapProvider>{children}</MapProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
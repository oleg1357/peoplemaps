"use client";

import { useTheme } from "@/lib/ThemeContext";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      id="theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}
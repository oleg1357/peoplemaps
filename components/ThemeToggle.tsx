"use client";

import { useTheme } from "@/lib/ThemeContext";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      id="theme-toggle"
      className="ml-1.5 inline-flex size-9 items-center justify-center rounded-md p-0 text-ink transition-colors hover:bg-green/[0.14] hover:text-green-dark"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}
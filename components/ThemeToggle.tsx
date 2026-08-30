"use client";

import { useTheme } from "@/lib/ThemeContext";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle({ mobile = false }: { mobile?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      id="theme-toggle"
      className={mobile ? "mobile" : ""}
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { PeopleMapsLogo } from "./Logo";
import { IconMapMarker } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

const MOBILE_MENU_QUERY = "(max-width: 1000px)";

export function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  // Close the dropdown after any navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape and hand focus back to the burger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Move focus into the dropdown when it opens.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
  }, [open]);

  // Trap Tab inside the dropdown, but only while it really is a dropdown
  // (the burger-driven overlay below the tablet breakpoint). On wide screens
  // the links are inline and the page flow must stay tabbable.
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia(MOBILE_MENU_QUERY).matches) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const menu = menuRef.current;
      const focusables = Array.from(
        menu?.querySelectorAll<HTMLElement>("a, button") ?? []
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !menu?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !menu?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closeAndResetFocus = () => {
    setOpen(false);
    burgerRef.current?.focus();
  };

  const close = () => setOpen(false);

  const cls = (path: string) => (pathname === path ? "active" : "");
  const current = (path: string) => (pathname === path ? "page" : undefined);

  return (
    <>
    <div id="nav">
      <div className="logo flex">
        <Link href="/" className="logo-link" onClick={close}>
          <PeopleMapsLogo size={30} />
          <h3 id="logo-text">PeopleMaps</h3>
        </Link>
      </div>

      <nav
        id="nav-menu"
        ref={menuRef}
        className={`nav-links ${open ? "open" : ""}`}
        aria-label="Main"
      >
        <Link href="/" className={cls("/")} aria-current={current("/")} onClick={close}>
          Home
        </Link>
        <Link id="map-link" href="/map" className={cls("/map")} aria-current={current("/map")} onClick={close}>
          Maps
        </Link>
        <Link href="/map?add=1" onClick={close}>
          <IconMapMarker size={15} /> + Add spot
        </Link>
        <Link href="/about" className={cls("/about")} aria-current={current("/about")} onClick={close}>
          About
        </Link>
        {user ? (
          <>
            <Link href="/profile" className={cls("/profile")} aria-current={current("/profile")} onClick={close}>
              Profile
            </Link>
            <Link href="/admin" className={cls("/admin")} aria-current={current("/admin")} onClick={close}>
              Admin
            </Link>
            <a
              id="log-out"
              onClick={(e) => {
                e.preventDefault();
                close();
                logout();
              }}
            >
              Log out
            </a>
          </>
        ) : (
          <>
            <Link href="/signup" className={cls("/signup")} aria-current={current("/signup")} onClick={close}>
              Create profile
            </Link>
            <Link href="/login" className={cls("/login")} aria-current={current("/login")} onClick={close}>
              Login
            </Link>
          </>
        )}
        <ThemeToggle />
      </nav>

      <button
        type="button"
        ref={burgerRef}
        className={`nav-burger ${open ? "open" : ""}`}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
    </div>
    {open && (
      <button
        type="button"
        className="nav-backdrop"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={closeAndResetFocus}
      />
    )}
    </>
  );
}
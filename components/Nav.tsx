"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { PeopleMapsLogo } from "./Logo";
import { IconMapMarker } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOBILE_MENU_QUERY = "(max-width: 1000px)";

const linkCls =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-2 text-[15px] font-medium text-ink transition-colors hover:bg-green/[0.14] hover:text-ink max-[1000px]:px-4 max-[1000px]:py-3 max-[1000px]:text-base";

const linkActive = "bg-green/[0.12] font-semibold text-green-dark";

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

  const linkClass = (path: string) => cn(linkCls, pathname === path && linkActive);
  const current = (path: string) => (pathname === path ? "page" : undefined);

  return (
    <>
      <div id="nav">
        <div className="logo flex">
          <Link href="/" className="logo-link" onClick={close} prefetch={false}>
            <PeopleMapsLogo size={30} />
            <h3 id="logo-text">PeopleMaps</h3>
          </Link>
        </div>

        <nav
          id="nav-menu"
          ref={menuRef}
          className={cn("nav-links flex items-center gap-1", open && "open")}
          aria-label="Main"
        >
          <Link href="/" className={linkClass("/")} aria-current={current("/")} onClick={close} prefetch={false}>
            Home
          </Link>
          <Link
            href="/map"
            className={cn(
              buttonVariants({
                className:
                  "h-auto bg-gradient-to-r from-green to-green-light px-3.5 py-2 text-white shadow-sm hover:from-green-light hover:to-green hover:brightness-105 max-[1000px]:h-auto max-[1000px]:justify-start max-[1000px]:px-4 max-[1000px]:py-3 max-[1000px]:text-base",
              })
            )}
            aria-current={current("/map")}
            onClick={close}
            prefetch={false}
          >
            Maps
          </Link>
          <Link href="/map?add=1" className={cn(linkCls, "text-green-dark")} onClick={close} prefetch={false}>
            <IconMapMarker size={15} /> + Add spot
          </Link>
          <Link href="/about" className={linkClass("/about")} aria-current={current("/about")} onClick={close} prefetch={false}>
            About
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className={linkClass("/dashboard")} aria-current={current("/dashboard")} onClick={close} prefetch={false}>
                Dashboard
              </Link>
              <Button
                type="button"
                variant="ghost"
                id="log-out"
                className="h-auto cursor-pointer px-3.5 py-2 text-[15px] font-medium text-ink hover:bg-red-500/10 hover:text-danger max-[1000px]:h-auto max-[1000px]:justify-start max-[1000px]:px-4 max-[1000px]:py-3 max-[1000px]:text-base"
                onClick={() => {
                  close();
                  logout();
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/signup" className={linkClass("/signup")} aria-current={current("/signup")} onClick={close} prefetch={false}>
                Create profile
              </Link>
              <Link href="/login" className={linkClass("/login")} aria-current={current("/login")} onClick={close} prefetch={false}>
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
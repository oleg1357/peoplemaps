"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { PeopleMapsLogo } from "./Logo";
import { IconHome, IconMapMarker, IconPlus, IconUser } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

export function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  if (mobile) {
    return (
      <div id="navMobile">
        <Link href="/about">
          <IconHome size={32} />
        </Link>
        <Link id="map-link" href="/">
          <IconMapMarker size={32} />
        </Link>
        <Link href="/?add=1">
          <IconPlus size={32} />
        </Link>
        {user ? (
          <Link href="/profile">
            <IconUser size={32} />
          </Link>
        ) : (
          <Link href="/login">
            <IconUser size={32} />
          </Link>
        )}
        <ThemeToggle mobile />
      </div>
    );
  }

  return (
    <div id="nav">
      <div className="logo flex">
        <PeopleMapsLogo size={30} />
        <h3 id="logo-text">PeopleMaps</h3>
      </div>
      <nav className="nav-links">
        <Link id="map-link" href="/" className={pathname === "/" ? "active" : ""}>
          Maps
        </Link>
        <Link href="/?add=1">
          + Add spot
        </Link>
        <Link href="/about" className={pathname === "/about" ? "active" : ""}>
          About
        </Link>
        {user ? (
          <>
            <Link href="/profile" className={pathname === "/profile" ? "active" : ""}>
              Profile
            </Link>
            <a id="log-out" onClick={(e) => { e.preventDefault(); logout(); }}>
              Log out
            </a>
          </>
        ) : (
          <>
            <Link href="/signup" className={pathname === "/signup" ? "active" : ""}>
              Create profile
            </Link>
            <Link href="/login" className={pathname === "/login" ? "active" : ""}>
              Login
            </Link>
          </>
        )}
        <ThemeToggle />
      </nav>
    </div>
  );
}

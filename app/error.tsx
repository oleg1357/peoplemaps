"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconMapMarker } from "@/components/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page">
      <div className="sign-box" style={{ paddingTop: "4em" }}>
        <div className="about-icon">
          <IconMapMarker size={90} color="#F94848" />
        </div>
        <h1>Something went wrong</h1>
        <p className="muted" style={{ maxWidth: 460, textAlign: "center" }}>
          An unexpected error occurred while loading this page. You can try
          again, or head back to the map.
        </p>
        <div className="home-hero-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="action-btn" onClick={reset}>
            Try again
          </button>
          <Link href="/map" className="action-btn2" style={{ textDecoration: "none" }}>
            Back to the map
          </Link>
        </div>
      </div>
    </div>
  );
}

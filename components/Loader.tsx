"use client";

import { useEffect, useState } from "react";
import { PeopleMapsLogo } from "./Logo";

export function Loader({ show }: { show?: boolean }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (show === false) {
      setHidden(true);
      return;
    }
    const t = setTimeout(() => setHidden(true), 1750);
    return () => clearTimeout(t);
  }, [show]);

  if (hidden) return null;

  return (
    <div className="loader-overlay">
      <div className="loader-bounce">
        <PeopleMapsLogo size={250} />
      </div>
    </div>
  );
}

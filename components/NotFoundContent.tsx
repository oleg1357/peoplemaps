"use client";

import { useRouter } from "next/navigation";
import { IconExclamation } from "./icons";

export function NotFoundContent() {
  const router = useRouter();
  return (
    <div className="page">
      <div id="not-found">
        <h1>
          <IconExclamation size={28} color="#69D57C" /> Ooops!
        </h1>
        <h2 id="oops-text" className="muted">
          Seems like the route doesn&apos;t exist or you do not have permission
          to access it!
        </h2>
        <button className="action-btn2" onClick={() => router.push("/map")}>
          Go back to the map
        </button>
      </div>
    </div>
  );
}

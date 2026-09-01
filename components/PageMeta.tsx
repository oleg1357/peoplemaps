"use client";

import { useEffect } from "react";

type PageMetaProps = {
  title: string;
  description?: string;
  noIndex?: boolean;
};

// Runtime metadata for client-rendered pages (Next metadata exports are not
// available on "use client" components). Sets document.title and robots meta.
export function PageMeta({ title, description, noIndex }: PageMetaProps) {
  useEffect(() => {
    document.title = title;
    if (description) {
      let el = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      if (!el) {
        el = document.createElement("meta");
        el.name = "description";
        document.head.appendChild(el);
      }
      el.content = description;
    }
    if (noIndex) {
      let el = document.querySelector<HTMLMetaElement>(
        'meta[name="robots"]'
      );
      if (!el) {
        el = document.createElement("meta");
        el.name = "robots";
        document.head.appendChild(el);
      }
      el.content = "noindex, nofollow";
    }
  }, [title, description, noIndex]);
  return null;
}

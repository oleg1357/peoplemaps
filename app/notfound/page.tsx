import type { Metadata } from "next";
import { NotFoundContent } from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Not found — PeopleMaps",
  robots: { index: false, follow: false },
};

export default function NotFoundRoute() {
  return <NotFoundContent />;
}

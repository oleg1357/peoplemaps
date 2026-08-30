"use client";

import dynamic from "next/dynamic";

const NewLocationPage = dynamic(
  () => import("@/components/NewLocationPage").then((m) => m.NewLocationPage),
  { ssr: false }
);

export default function NewLocation() {
  return <NewLocationPage />;
}

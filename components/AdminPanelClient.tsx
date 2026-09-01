"use client";

import dynamic from "next/dynamic";

const AdminPanel = dynamic(
  () => import("@/components/AdminPanel").then((m) => m.AdminPanel),
  { ssr: false }
);

export function AdminPanelClient() {
  return <AdminPanel />;
}

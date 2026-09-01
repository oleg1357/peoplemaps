import type { Metadata } from "next";
import { AdminPanelClient } from "@/components/AdminPanelClient";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanelClient />;
}

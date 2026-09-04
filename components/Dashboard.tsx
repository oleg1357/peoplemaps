"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { PageMeta } from "@/components/PageMeta";
import { IconLogout, IconMapMarker, IconList } from "@/components/icons";
import { AdminPanel } from "./AdminPanel";
import ProfilePanel from "./ProfilePanel";

type DashboardTab = "profile" | "admin";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("profile");

  if (!user) {
    return (
      <div className="page">
        <PageMeta title="Dashboard — PeopleMaps" description="Your dashboard." noIndex />
        <div className="admin-empty">
          <p>You must be signed in to open your dashboard.</p>
        </div>
      </div>
    );
  }

  const initials = user.firstName?.slice(0, 1) || user.email?.slice(0, 1) || "?";
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Your dashboard";

  return (
    <div className="page">
      <PageMeta title="Dashboard — PeopleMaps" description="Your dashboard." noIndex />

      <div className="dash-shell">
        <div className="dash-head">
          <div className="dash-identity">
            <div className="dash-avatar">{initials}</div>
            <div className="dash-identity-info">
              <h1>{displayName}</h1>
              <p className="muted">{user.email}</p>
            </div>
          </div>
          <button className="action-btn2 logout-btn" onClick={logout}>
            <IconLogout size={16} /> Log out
          </button>
        </div>

        <div className="dash-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "profile"}
            className={`dash-tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <IconList size={15} /> My activity
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "admin"}
            className={`dash-tab ${tab === "admin" ? "active" : ""}`}
            onClick={() => setTab("admin")}
          >
            <IconMapMarker size={15} /> Map admin
          </button>
        </div>

        <div className="dash-body">
          {tab === "profile" ? <ProfilePanel /> : <AdminPanel />}
        </div>
      </div>
    </div>
  );
}

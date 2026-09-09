"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { PageMeta } from "@/components/PageMeta";
import { IconLogout, IconMapMarker, IconList } from "@/components/icons";
import { AdminPanel } from "./AdminPanel";
import ProfilePanel from "./ProfilePanel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DashboardTab = "profile" | "admin";

export default function Dashboard({ initialMapId }: { initialMapId?: string | null }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<DashboardTab>(initialMapId ? "admin" : "profile");

  if (!user) {
    return (
      <div className="page">
        <PageMeta title="Dashboard — PeopleMaps" description="Your dashboard." noIndex />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <p className="text-muted-foreground">
            You must be signed in to open your dashboard.
          </p>
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

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Avatar className="size-14 bg-gradient-to-br from-sky-500 to-violet-500 text-xl font-bold text-white">
              <AvatarFallback className="bg-transparent text-xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="m-0 text-[22px] leading-snug text-ink">{displayName}</h1>
              <p className="m-0 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={logout}>
            <IconLogout size={16} /> Log out
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as DashboardTab)}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="profile" className="px-3">
              <IconList size={15} /> My activity
            </TabsTrigger>
            <TabsTrigger value="admin" className="px-3">
              <IconMapMarker size={15} /> Map admin
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-5">
          {tab === "profile" ? (
            <ProfilePanel />
          ) : (
            <AdminPanel initialMapId={initialMapId} />
          )}
        </div>
      </div>
    </div>
  );
}
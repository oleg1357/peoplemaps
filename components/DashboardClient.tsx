"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
});

function DashboardParams() {
  const searchParams = useSearchParams();
  return <Dashboard initialMapId={searchParams.get("map")} />;
}

export function DashboardClient() {
  return (
    <Suspense fallback={null}>
      <DashboardParams />
    </Suspense>
  );
}
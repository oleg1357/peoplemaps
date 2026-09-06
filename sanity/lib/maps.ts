"use client";

import { useEffect, useState } from "react";
import { client } from "./client";
import { MAP_CORE_FIELDS, MAP_FIELDS } from "./queries";
import type { MapDocument } from "@/lib/types";

export function useMapById(id: string | null): {
  map: MapDocument | null;
  loading: boolean;
} {
  const [map, setMap] = useState<MapDocument | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || !client) {
      setMap(null);
      return;
    }
    let active = true;
    setLoading(true);
    client
      .fetch(
        `*[_id == $id][0]{ ${MAP_CORE_FIELDS} ${MAP_FIELDS} }`,
        { id }
      )
      .then((data) => {
        if (active) setMap(data ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { map, loading };
}

export function useMaps(ownerId?: string | null): {
  maps: MapDocument[];
  loading: boolean;
  reload: () => void;
} {
  const [maps, setMaps] = useState<MapDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Fetch through our own API route so the browser never talks to Sanity
    // directly. That avoids Sanity's per-origin CORS allow-list, which blocked
    // this hook in production (the deployed origin wasn't whitelisted -> 403).
    fetch(`/api/maps${ownerId ? `?owner=${encodeURIComponent(ownerId)}` : ""}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) setMaps((data as MapDocument[]) ?? []);
      })
      .catch(() => {
        if (active) setMaps([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ownerId, tick]);

  const reload = () => setTick((t) => t + 1);

  return { maps, loading, reload };
}

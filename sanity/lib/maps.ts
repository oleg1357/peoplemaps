"use client";

import { useEffect, useState } from "react";
import { client } from "./client";
import { MAP_CORE_FIELDS, MAP_FIELDS } from "./queries";
import { fetchPublicMaps, clearDataCache, backendLive } from "@/lib/api-client";
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
    // Demo mode has no backend — MapContext serves the seeded demo maps, so
    // skip the network call entirely.
    if (!backendLive) {
      setMaps([]);
      setLoading(false);
      return;
    }
    // Fetch through our own API route so the browser never talks to Sanity
    // directly (Sanity's per-origin CORS allow-list blocked this in production).
    // The public list goes through fetchPublicMaps(), which skips the auth header
    // and serves a shared 60s cache so repeat visits issue no request. The owner
    // list is user-scoped and therefore fetched uncached.
    const request = ownerId
      ? fetch(
          `/api/maps?owner=${encodeURIComponent(ownerId)}`,
          { cache: "no-store" }
        )
          .then((r) => (r.ok ? r.json() : ([] as MapDocument[])))
          .catch(() => [] as MapDocument[])
      : fetchPublicMaps();
    request
      .then((data) => {
        if (active) setMaps(data ?? []);
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

  const reload = () => {
    clearDataCache();
    setTick((t) => t + 1);
  };

  return { maps, loading, reload };
}

"use client";

import { useEffect, useState } from "react";
import { client } from "./client";
import { MAP_FIELDS } from "./queries";
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
        `*[_id == $id][0]{ _id, _createdAt, title, "slug": slug.current, description, ownerId, ownerName, isPublic, baseCenter, baseZoom${MAP_FIELDS} }`,
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
    if (!client) {
      setMaps([]);
      return;
    }
    let active = true;
    setLoading(true);
    const query = ownerId
      ? `*[_type == "map" && ownerId == $ownerId] | order(_createdAt desc){ _id, title, "slug": slug.current, description, ownerId, ownerName, isPublic, baseCenter, baseZoom${MAP_FIELDS} }`
      : `*[_type == "map" && isPublic == "public"] | order(_createdAt desc){ _id, title, "slug": slug.current, description, ownerId, ownerName, isPublic, baseCenter, baseZoom${MAP_FIELDS} }`;
    client
      .fetch(query, ownerId ? { ownerId } : {})
      .then((data) => {
        if (active) setMaps((data as MapDocument[]) ?? []);
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

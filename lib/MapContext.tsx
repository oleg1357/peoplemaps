"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useMaps } from "@/sanity/lib/maps";
import type { MapDocument, Spot } from "@/lib/types";
import {
  fetchMapSpots,
  createSpot,
  deleteSpot,
  backendLive,
} from "@/lib/api-client";

interface MapContextValue {
  backendLive: boolean;
  maps: MapDocument[];
  mapsLoading: boolean;
  activeMap: MapDocument | null;
  selectMap: (id: string | null) => void;
  spots: Spot[];
  spotsLoading: boolean;
  reloadSpots: () => void;
  addSpot: (input: Omit<Spot, "_id" | "createdAt">) => Promise<Spot | null>;
  removeSpot: (spotId: string) => Promise<void>;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const { maps, loading: mapsLoading, reload } = useMaps();
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(false);

  const activeMap =
    maps.find((m) => m._id === activeMapId) ?? maps[0] ?? null;

  const reloadSpots = useCallback(async () => {
    if (!backendLive || !activeMapId) {
      setSpots([]);
      return;
    }
    setSpotsLoading(true);
    try {
      const data = await fetchMapSpots(activeMapId);
      setSpots(data);
    } catch {
      setSpots([]);
    } finally {
      setSpotsLoading(false);
    }
  }, [activeMapId]);

  useEffect(() => {
    reloadSpots();
  }, [reloadSpots, activeMapId]);

  // When maps load and nothing selected yet, pick the first.
  useEffect(() => {
    if (!activeMapId && maps.length > 0) setActiveMapId(maps[0]._id);
  }, [maps, activeMapId]);

  const selectMap = useCallback((id: string | null) => {
    setActiveMapId(id);
  }, []);

  const addSpot = useCallback(
    async (input: Omit<Spot, "_id" | "createdAt">) => {
      try {
        const spot = await createSpot(input);
        await reloadSpots();
        reload();
        return spot;
      } catch {
        return null;
      }
    },
    [reloadSpots, reload]
  );

  const removeSpot = useCallback(
    async (spotId: string) => {
      try {
        await deleteSpot(spotId);
        setSpots((prev) => prev.filter((s) => s._id !== spotId));
      } catch {
        // ignore
      }
    },
    []
  );

  const value: MapContextValue = useMemo(
    () => ({
      backendLive,
      maps,
      mapsLoading,
      activeMap,
      selectMap,
      spots,
      spotsLoading,
      reloadSpots,
      addSpot,
      removeSpot,
    }),
    [maps, mapsLoading, activeMap, selectMap, spots, spotsLoading, reloadSpots, addSpot, removeSpot]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapData(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapData must be used within MapProvider");
  return ctx;
}

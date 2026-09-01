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
  fetchMapData,
  createSpot,
  deleteSpot,
  backendLive,
  type MapData,
} from "@/lib/api-client";

interface MapContextValue {
  backendLive: boolean;
  maps: MapDocument[];
  mapsLoading: boolean;
  activeMap: MapDocument | null;
  selectMap: (id: string | null) => void;
  mapData: MapData;
  spots: Spot[];
  spotsLoading: boolean;
  reloadMapData: () => void;
  patchMapData: (fn: (d: MapData) => MapData) => void;
  addSpot: (input: Omit<Spot, "_id" | "createdAt">) => Promise<Spot | null>;
  removeSpot: (spotId: string) => Promise<void>;
}

const MapContext = createContext<MapContextValue | null>(null);

const EMPTY_DATA: MapData = {
  spots: [],
  reviews: [],
  comments: [],
  photos: [],
  watches: [],
  saved: [],
};

export function MapProvider({ children }: { children: ReactNode }) {
  const { maps, loading: mapsLoading } = useMaps();
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData>(EMPTY_DATA);
  const [spotsLoading, setSpotsLoading] = useState(false);

  const activeMap =
    maps.find((m) => m._id === activeMapId) ?? maps[0] ?? null;

  // Everything for the selected map arrives in one request.
  const reloadMapData = useCallback(async () => {
    if (!backendLive || !activeMapId) {
      setMapData(EMPTY_DATA);
      return;
    }
    setSpotsLoading(true);
    try {
      const data = await fetchMapData(activeMapId);
      setMapData(data);
    } catch {
      setMapData(EMPTY_DATA);
    } finally {
      setSpotsLoading(false);
    }
  }, [activeMapId]);

  useEffect(() => {
    reloadMapData();
  }, [reloadMapData]);

  // When maps load and nothing selected yet, pick the first.
  useEffect(() => {
    if (!activeMapId && maps.length > 0) setActiveMapId(maps[0]._id);
  }, [maps, activeMapId]);

  const selectMap = useCallback((id: string | null) => {
    setActiveMapId(id);
  }, []);

  // Local, request-free updates after a mutation (review added, status set, …).
  const patchMapData = useCallback((fn: (d: MapData) => MapData) => {
    setMapData((prev) => fn(prev));
  }, []);

  const addSpot = useCallback(
    async (input: Omit<Spot, "_id" | "createdAt">) => {
      const res = await createSpot(input);
      // The create response already contains the refreshed public list, so the
      // map updates without a second (follow-up) request.
      setMapData((prev) => ({ ...prev, spots: res.spots }));
      return res.spot;
    },
    []
  );

  const removeSpot = useCallback(async (spotId: string) => {
    try {
      await deleteSpot(spotId);
      setMapData((prev) => {
        const spotReviewIds = prev.reviews
          .filter((r) => r.spotId === spotId)
          .map((r) => r._id);
        return {
          ...prev,
          spots: prev.spots.filter((s) => s._id !== spotId),
          reviews: prev.reviews.filter((r) => r.spotId !== spotId),
          comments: prev.comments.filter(
            (c) => !spotReviewIds.includes(c.reviewId)
          ),
          photos: prev.photos.filter((p) => p.spotId !== spotId),
          watches: prev.watches.filter((w) => String(w.spotId) !== String(spotId)),
          saved: prev.saved.filter((e) => String(e.spotId) !== String(spotId)),
        };
      });
    } catch {
      // ignore
    }
  }, []);

  const value: MapContextValue = useMemo(
    () => ({
      backendLive,
      maps,
      mapsLoading,
      activeMap,
      selectMap,
      mapData,
      spots: mapData.spots,
      spotsLoading,
      reloadMapData,
      patchMapData,
      addSpot,
      removeSpot,
    }),
    [maps, mapsLoading, activeMap, selectMap, mapData, spotsLoading, reloadMapData, patchMapData, addSpot, removeSpot]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapData(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapData must be used within MapProvider");
  return ctx;
}
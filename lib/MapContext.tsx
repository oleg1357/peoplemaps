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
import type { MapDocument, Spot, Zone, Route } from "@/lib/types";
import {
  fetchMapData,
  createSpot,
  deleteSpot,
  createZone,
  createRoute,
  backendLive,
  type MapData,
} from "@/lib/api-client";

interface MapContextValue {
  backendLive: boolean;
  maps: MapDocument[];
  mapsLoading: boolean;
  activeMap: MapDocument | null;
  selectMap: (id: string | null) => void;
  registerMap: (map: MapDocument) => void;
  mapData: MapData;
  spots: Spot[];
  zones: Zone[];
  routes: Route[];
  spotsLoading: boolean;
  reloadMapData: () => void;
  patchMapData: (fn: (d: MapData) => MapData) => void;
  addSpot: (input: Omit<Spot, "_id" | "createdAt">) => Promise<Spot | null>;
  removeSpot: (spotId: string) => Promise<void>;
  addZone: (input: Omit<Zone, "_id" | "createdAt">) => Promise<{ zone: Zone; zones: Zone[] }>;
  addRoute: (input: Omit<Route, "_id" | "createdAt">) => Promise<{ route: Route; routes: Route[] }>;
}

const MapContext = createContext<MapContextValue | null>(null);

const EMPTY_DATA: MapData = {
  spots: [],
  reviews: [],
  comments: [],
  photos: [],
  zones: [],
  routes: [],
};

export function MapProvider({ children }: { children: ReactNode }) {
  const { maps: publicMaps, loading: mapsLoading } = useMaps();
  // A map seeded from a permalink page (`/map/[slug]`) — kept out of the public
  // fetch so private/just-created maps are still selectable.
  const [seededMap, setSeededMap] = useState<MapDocument | null>(null);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData>(EMPTY_DATA);
  const [spotsLoading, setSpotsLoading] = useState(false);

  const maps = useMemo(
    () =>
      seededMap
        ? [seededMap, ...publicMaps.filter((m) => m._id !== seededMap._id)]
        : publicMaps,
    [seededMap, publicMaps]
  );

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

  // Seeds a map (used by permalink/`/map/[slug]` pages so a private or
  // just-created map is selectable). Dedupes against the public list.
  const registerMap = useCallback((map: MapDocument) => {
    setActiveMapId(map._id);
    setSeededMap(map);
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

  const addZone = useCallback(
    async (input: Omit<Zone, "_id" | "createdAt">) => {
      const res = await createZone(input);
      setMapData((prev) => ({ ...prev, zones: res.zones }));
      return res;
    },
    []
  );

  const addRoute = useCallback(
    async (input: Omit<Route, "_id" | "createdAt">) => {
      const res = await createRoute(input);
      setMapData((prev) => ({ ...prev, routes: res.routes }));
      return res;
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
      registerMap,
      mapData,
      spots: mapData.spots,
      zones: mapData.zones,
      routes: mapData.routes,
      spotsLoading,
      reloadMapData,
      patchMapData,
      addSpot,
      removeSpot,
      addZone,
      addRoute,
    }),
    [maps, mapsLoading, activeMap, selectMap, registerMap, mapData, spotsLoading, reloadMapData, patchMapData, addSpot, removeSpot, addZone, addRoute]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapData(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapData must be used within MapProvider");
  return ctx;
}
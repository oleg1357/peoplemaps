"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getSavedSpots } from "@/lib/store";
import { backendLive, fetchSavedSpots, fetchSpotById } from "@/lib/api-client";
import type { SavedSpot } from "@/lib/data";
import { IconHeart, IconLogout, IconUser } from "@/components/icons";

interface SavedLocation {
  spotId: string;
  name: string;
  city: string;
  street: string;
  zip: number;
  note: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [locations, setLocations] = useState<SavedLocation[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    if (!backendLive) {
      setLocations(
        getSavedSpots(String(user.id)).map((loc: SavedSpot) => ({
          spotId: String(loc.spot_fk),
          name: loc.name,
          city: loc.city,
          street: loc.street,
          zip: loc.zip,
          note: loc.note,
        }))
      );
      return;
    }
    (async () => {
      try {
        const entries = await fetchSavedSpots(String(user.id));
        const spots = await Promise.all(
          entries.map((e) => fetchSpotById(e.spotId).catch(() => null))
        );
        if (!active) return;
        setLocations(
          entries.map((e, i) => {
            const s = spots[i];
            return {
              spotId: e.spotId,
              name: s?.name ?? "Spot",
              city: s?.city ?? "",
              street: s?.street ?? "",
              zip: s?.zip ?? 0,
              note: e.note,
            };
          })
        );
      } catch {
        if (active) setLocations([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="page">
      <div className="flex auth-layout" style={{ height: "100%" }}>
        <div className="profile-box">
          <div className="circle">
            <IconUser size={48} />
          </div>
          <div>
            <h2>
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="muted">{user?.email}</p>
          </div>
          <button className="action-btn2 logout-btn" onClick={logout}>
            <IconLogout size={16} /> Log out
          </button>
        </div>
        <div className="profile-content">
          <div className="profile-title">
            <h2>My favourite locations</h2>
          </div>
          <div className="flex">
            {locations.map((loc) => (
              <div id="favourites-overview" key={loc.spotId}>
                <div className="fav-card">
                  <div className="fav-card-title">
                    <IconHeart size={18} color="#D90368" /> {loc.name}
                  </div>
                  <div className="fav-card-sub">
                    {loc.street} {loc.zip}
                  </div>
                  <div className="fav-card-text">My note: {loc.note}</div>
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <p className="empty-state">You have no favourite locations yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

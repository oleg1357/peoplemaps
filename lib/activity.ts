import { COLLECTIONS, getDb } from "@/lib/mongodb";

// An audit-trail entry recording a moderation/management action on a map. Kept
// in Mongo so admins can see who did what to a map (approve/reject/hide/edit/
// destroy spots, zones and routes, and map-level changes).
export interface ActivityEntry {
  _id?: string;
  mapId: string; // Sanity map document _id
  actorId: string | null; // Supabase user id who performed the action
  action: string; // human/machine-readable verb, e.g. "spot.approve"
  targetType: "spot" | "zone" | "route" | "map";
  targetId?: string | null;
  targetName?: string | null; // spot/zone/route name at the time of the action
  detail?: string | null;
  createdAt: string; // ISO timestamp
}

// Best-effort write; never throws so auditing can't take a write route down.
export async function logActivity(entry: Omit<ActivityEntry, "_id" | "createdAt">): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection<ActivityEntry>(COLLECTIONS.activityLog).insertOne({
      ...entry,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to write activity log:", err instanceof Error ? err.message : err);
  }
}

import { COLLECTIONS, getDb } from "@/lib/mongodb";
import type { MapRules, ModerationStatus, ModerationRule } from "@/lib/types";

// Per-map auto-moderation rules (stored in Mongo). Every read/write is
// best-effort: if the DB is unreachable the app behaves exactly as before the
// feature existed (submissions stay "pending"), so auto-mod can never take a
// write route down.

export async function getMapRules(mapId: string): Promise<MapRules | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const rules = await db
      .collection<MapRules>(COLLECTIONS.mapRules)
      .findOne({ mapId });
    return rules ?? null;
  } catch {
    return null;
  }
}

export async function saveMapRules(
  mapId: string,
  enabled: boolean,
  rules: ModerationRule[],
  updatedBy: string | null
): Promise<MapRules | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const doc: MapRules = {
      mapId,
      enabled,
      rules,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    await db.collection<MapRules>(COLLECTIONS.mapRules).updateOne(
      { mapId },
      { $set: doc },
      { upsert: true }
    );
    return doc;
  } catch {
    return null;
  }
}

// Scope of a submission we can scan. `tags` is pre-split on the client.
export interface ModerationInput {
  name: string;
  tip?: string | null;
  tags?: string[] | null;
  hoursNote?: string | null;
  description?: string | null;
}

// Applies the map's auto-moderation rules to a new submission. Returns a
// moderation status to force, or null when no rule matched.
export async function applyAutoModeration(
  mapId: string,
  input: ModerationInput
): Promise<ModerationStatus | null> {
  const rules = await getMapRules(mapId);
  if (!rules?.enabled || rules.rules.length === 0) return null;

  const hay = [
    input.name,
    input.tip,
    input.hoursNote,
    input.description,
    (input.tags ?? []).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let reject = false;
  let approve = false;
  for (const rule of rules.rules) {
    const pattern = String(rule.pattern ?? "").trim().toLowerCase();
    if (!pattern) continue;
    if (rule.field === "name" && !input.name.toLowerCase().includes(pattern)) {
      continue;
    }
    if (rule.field === "tip" && !String(input.tip ?? "").toLowerCase().includes(pattern)) {
      continue;
    }
    if (
      rule.field === "tags" &&
      !(input.tags ?? []).some((t) => t.toLowerCase().includes(pattern))
    ) {
      continue;
    }
    if (rule.field === "any" && !hay.includes(pattern)) continue;

    if (rule.action === "reject") reject = true;
    else approve = true;
  }

  // Reject rules win over approve rules so a spam pattern catches everything.
  if (reject) return "rejected";
  if (approve) return "approved";
  return null;
}
import { json, error } from "@/lib/api";
import { getAdminContext, canManageMap } from "@/lib/admin";
import { getMapRules, saveMapRules } from "@/lib/moderation-rules";
import type { ModerationRule } from "@/lib/types";

const MAX_RULES = 25;
const MAX_PATTERN_LEN = 60;

// Owner-only endpoints for a map's auto-moderation rules (stored in Mongo).
// Moderators can review content in the queue but only the owner changes the
// rules that decide how new submissions are auto-modded.

// GET /api/admin/maps/rules?mapId=<mapId>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  const rules = await getMapRules(mapId);
  return json({ rules });
}

// PUT /api/admin/maps/rules  { mapId, enabled, rules }
export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    mapId?: string;
    enabled?: boolean;
    rules?: unknown;
  } | null;
  if (!body?.mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, body.mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  const cleaned: ModerationRule[] = [];
  if (Array.isArray(body.rules)) {
    for (const r of body.rules.slice(0, MAX_RULES)) {
      const rule = r as Partial<ModerationRule>;
      const pattern = String(rule?.pattern ?? "").trim().slice(0, MAX_PATTERN_LEN);
      if (!pattern) continue;
      const action = rule?.action === "reject" ? "reject" : "approve";
      const field =
        rule?.field === "name" ||
        rule?.field === "tip" ||
        rule?.field === "tags"
          ? rule.field
          : "any";
      cleaned.push({
        id: String(rule?.id ?? Math.random().toString(36).slice(2)),
        action,
        field,
        pattern,
      });
    }
  }

  const saved = await saveMapRules(
    body.mapId,
    body.enabled === true,
    cleaned,
    ctx.userId
  );

  return saved ? json({ ok: true, rules: saved }) : error("Failed to save rules.");
}
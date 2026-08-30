import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import type { SavedEntry } from "@/lib/types";

// ---- Saved (favourites) ----
// GET /api/saved?userId=<id>
// POST /api/saved -> { userId, spotId, note, on }
export async function GET(req: Request) {
  const ctx = await getOptionalContext(req);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? ctx.userId;
  if (!userId) return error("Missing userId");
  return withDb(async (db) => {
    const saved = await db
      .collection<SavedEntry>(COLLECTIONS.saved)
      .find({ userId })
      .toArray();
    return json(saved);
  });
}

export async function POST(req: Request) {
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  const userId = body.userId ?? ctx.userId;
  if (!body.spotId || !userId) return error("Missing spotId or userId");
  const spotId: string = String(body.spotId);
  const on = Boolean(body.on);
  return withDb(async (db) => {
    const col = db.collection<SavedEntry>(COLLECTIONS.saved);
    if (on) {
      await col.updateOne(
        { userId, spotId },
        { $setOnInsert: { userId, spotId, note: String(body.note ?? "") } },
        { upsert: true }
      );
    } else {
      await col.deleteOne({ userId, spotId });
    }
    return json({ ok: true });
  });
}

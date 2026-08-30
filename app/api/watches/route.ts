import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import type { WatchEntry } from "@/lib/types";

// GET /api/watches?userId=<id>
// POST /api/watches -> { userId, spotId, on }
export async function GET(req: Request) {
  const ctx = await getOptionalContext(req);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? ctx.userId;
  if (!userId) return error("Missing userId");
  return withDb(async (db) => {
    const watches = await db
      .collection<WatchEntry>(COLLECTIONS.watches)
      .find({ userId })
      .toArray();
    return json(watches);
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
    const col = db.collection<WatchEntry>(COLLECTIONS.watches);
    if (on) {
      await col.updateOne(
        { userId, spotId },
        { $setOnInsert: { userId, spotId } },
        { upsert: true }
      );
    } else {
      await col.deleteOne({ userId, spotId });
    }
    return json({ ok: true });
  });
}

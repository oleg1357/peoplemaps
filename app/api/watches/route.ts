import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import type { WatchEntry } from "@/lib/types";

// GET /api/watches?userId=<id>
// POST /api/watches -> { spotId, userId?, on? }. Toggles when `on` is omitted,
// so a signed-in user's click is a single request. Returns { ok, on }.
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
  const spotId: string = String(body.spotId ?? "");
  const userId = body.userId ?? ctx.userId;
  if (!spotId || !userId) return error("Missing spotId or userId");
  return withDb(async (db) => {
    const col = db.collection<WatchEntry>(COLLECTIONS.watches);
    const on =
      body.on !== undefined
        ? Boolean(body.on)
        : !(await col.findOne({ userId, spotId }));
    if (on) {
      await col.updateOne(
        { userId, spotId },
        { $setOnInsert: { userId, spotId } },
        { upsert: true }
      );
    } else {
      await col.deleteOne({ userId, spotId });
    }
    return json({ ok: true, on });
  });
}

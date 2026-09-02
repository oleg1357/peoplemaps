import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import type { SpotPhoto } from "@/lib/types";

// GET /api/photos?spotId=<id>
// POST /api/photos -> upload photo (dataUrl)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");
  return withDb(async (db) => {
    const photos = await db
      .collection<SpotPhoto>(COLLECTIONS.photos)
      .find({ spotId })
      .sort({ date: -1 })
      .toArray();
    return json(photos);
  });
}

export async function POST(req: Request) {
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  if (!body.spotId || !body.dataUrl) return error("Missing spotId or dataUrl");
  const spotId: string = String(body.spotId);
  const photo: SpotPhoto = {
    spotId,
    dataUrl: String(body.dataUrl),
    date: new Date().toISOString().slice(0, 10),
    uploader_fk: ctx.userId ?? body.uploader_fk ?? null,
  };
  return withDb(async (db) => {
    const col = db.collection<SpotPhoto>(COLLECTIONS.photos);
    const existing = await col.countDocuments({ spotId });
    if (existing >= 6) {
      // keep only the 6 most recent
      const oldest = await col
        .find({ spotId })
        .sort({ date: 1 })
        .limit(existing - 5)
        .toArray();
      if (oldest.length) {
        await col.deleteMany({ _id: { $in: oldest.map((p) => p._id) } });
      }
    }
    const result = await col.insertOne(photo);
    return json({ ...photo, _id: result.insertedId }, { status: 201 });
  });
}

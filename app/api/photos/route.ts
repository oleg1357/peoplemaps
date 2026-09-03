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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  if (!body.spotId || !body.dataUrl) return error("Missing spotId or dataUrl");
  const dataUrl: string = String(body.dataUrl);

  // Validate dataUrl format and rough size (base64 inflates ~33%)
  if (!/^data:image\/(jpeg|png|webp|gif);base64,/.test(dataUrl)) {
    return error("dataUrl must be a base64 data URL (jpeg, png, webp, or gif)");
  }
  const base64Payload = dataUrl.split(",")[1] ?? "";
  const estimatedBytes = Math.ceil(base64Payload.length * 0.75);
  if (estimatedBytes > MAX_PHOTO_BYTES) {
    return error(`Photo exceeds the ${MAX_PHOTO_BYTES / 1024 / 1024} MB size limit`);
  }

  const spotId: string = String(body.spotId);
  const photo: SpotPhoto = {
    spotId,
    dataUrl,
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

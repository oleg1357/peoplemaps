import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, rateLimitByIp } from "@/lib/api";
import { getAdminContext, getMap, canContribute } from "@/lib/admin";
import { isBannedOnMap } from "@/lib/api";
import type { SpotPhoto, Spot } from "@/lib/types";

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
    return json(photos, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=600",
      },
    });
  });
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const lim = await rateLimitByIp(req, 5, 60_000, "photos");
  if (!lim.ok) return error("Too many photo uploads. Try again shortly.", 429);
  const ctx = await getAdminContext(req);
  const body = await req.json();
  if (!body.spotId || !body.dataUrl) return error("Missing spotId or dataUrl");
  const dataUrl: string = String(body.dataUrl);

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
    uploader_fk: ctx.userId,
  };
  return withDb(async (db) => {
    const col = db.collection<SpotPhoto>(COLLECTIONS.photos);
    const spot = await db.collection<Spot>(COLLECTIONS.spots).findOne({ _id: spotId as never } as never);
    if (!spot) return error("Spot not found", 404);
    const map = spot.mapId ? await getMap(spot.mapId) : null;

    // Enforce collaboration mode + ban checks.
    const contrib = await canContribute(ctx, map);
    if (!contrib.ok) return error(contrib.reason || "Forbidden", 403);
    if (ctx.userId && (await isBannedOnMap(db, spot.mapId, ctx.userId))) {
      return error("You are banned from contributing to this map.", 403);
    }

    if (map?.allowPhotos === false) {
      return error("Photo uploads are disabled for this map.", 403);
    }
    const maxPhotos = map?.maxPhotosPerSpot ?? 6;
    const existing = await col.countDocuments({ spotId });
    if (existing >= maxPhotos && maxPhotos > 0) {
      const oldest = await col
        .find({ spotId })
        .sort({ date: 1 })
        .limit(existing - (maxPhotos - 1))
        .toArray();
      if (oldest.length) {
        await col.deleteMany({ _id: { $in: oldest.map((p) => p._id) } });
      }
    }
    const result = await col.insertOne(photo);
    return json({ ...photo, _id: result.insertedId }, { status: 201 });
  });
}

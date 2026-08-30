import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import type { Spot } from "@/lib/types";

// GET /api/spots?mapId=<mapId>  -> all spots for a map
// POST /api/spots  -> create a spot
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  const spotId = searchParams.get("spotId");

  return withDb(async (db) => {
    const col = db.collection<Spot>(COLLECTIONS.spots);
    if (spotId) {
      const oid = toObjectId(spotId);
      if (!oid) return error("Invalid spot id");
      const spot = await col.findOne(byIdFilter<Spot>(oid));
      return spot ? json(spot) : error("Spot not found", 404);
    }
    if (!mapId) return error("Missing mapId");
    const spots = await col.find({ mapId }).sort({ createdAt: -1 }).toArray();
    return json(spots);
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Spot>;
  if (!body.mapId) return error("Missing mapId");
  if (!body.name || body.lat === undefined || body.lng === undefined) {
    return error("Spot requires name, lat and lng");
  }
  const spot: Spot = {
    mapId: body.mapId,
    name: String(body.name),
    street: String(body.street ?? ""),
    city: String(body.city ?? ""),
    zip: Number(body.zip ?? 0),
    lat: Number(body.lat),
    lng: Number(body.lng),
    createdBy: body.createdBy ?? null,
    createdAt: new Date().toISOString(),
  };
  return withDb(async (db) => {
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const result = await col.insertOne(spot);
    return json({ ...spot, _id: result.insertedId }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");
  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");
    await db.collection(COLLECTIONS.spots).deleteOne({ _id: oid });
    await db.collection(COLLECTIONS.reviews).deleteMany({ spotId });
    await db.collection(COLLECTIONS.photos).deleteMany({ spotId });
    return NextResponse.json({ ok: true });
  });
}

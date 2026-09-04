import { json, error } from "@/lib/api";
import { getAdminContext, canManageMap } from "@/lib/admin";
import { writeClient, serverClient } from "@/sanity/lib/client";

// POST /api/admin/maps/cover?mapId=<id>
// Uploads a cover image for a map. The file is sent as a raw body (image/*).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return json({ error: perm.reason || "Forbidden" }, { status: 403 });
  if (!writeClient || !serverClient) {
    return json(
      { error: "Sanity is not configured for the server." },
      { status: 503 }
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return error("Content-Type must be an image.");
  }
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.byteLength === 0) return error("Empty image body.");
  if (bytes.byteLength > 5 * 1024 * 1024) {
    return error("Image exceeds the 5 MB size limit.");
  }

  try {
    const asset = await writeClient.assets.upload("image", bytes, {
      contentType,
      filename: `cover-${mapId}.${contentType.split("/")[1] || "jpg"}`,
    });
    await writeClient
      .patch(mapId)
      .set({
        coverImage: {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
        },
      })
      .commit();
    return json({ ok: true, assetId: asset._id, url: asset.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Sanity error";
    return json({ error: `Failed to upload cover image: ${message}` }, { status: 500 });
  }
}

// DELETE /api/admin/maps/cover?mapId=<id> -> remove the cover image.
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return json({ error: perm.reason || "Forbidden" }, { status: 403 });
  if (!writeClient) {
    return json({ error: "Sanity is not configured." }, { status: 503 });
  }

  try {
    await writeClient
      .patch(mapId)
      .unset(["coverImage"])
      .commit();
    return json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Sanity error";
    return json({ error: `Failed to remove cover image: ${message}` }, { status: 500 });
  }
}

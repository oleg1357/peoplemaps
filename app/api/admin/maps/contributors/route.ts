import { json, error, withDb } from "@/lib/api";
import { getAdminContext, canModerateMap } from "@/lib/admin";
import { COLLECTIONS } from "@/lib/mongodb";
import type {
  Spot,
  Zone,
  Route,
  Review,
  ReviewComment,
  SpotPhoto,
  MapContributorEntry,
} from "@/lib/types";

const MAX_SPOTS_FOR_CONTENT = 2000;

interface Acc {
  userId: string | null;
  spots: number;
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
  zones: number;
  routes: number;
  reviews: number;
  comments: number;
  photos: number;
  lastActive: number; // epoch ms for easy max()
}

function bump(acc: Acc, key: "spots" | "pending" | "approved" | "rejected" | "hidden" | "zones" | "routes" | "reviews" | "comments" | "photos", at: string | null | undefined) {
  acc[key] += 1;
  const t = at ? Date.parse(at) : 0;
  if (Number.isFinite(t) && t > acc.lastActive) acc.lastActive = t;
}

// GET /api/admin/maps/contributors?mapId=<mapId>
// Aggregates how much each contributor submitted to a map, so owners can see
// who is doing the work (and who keeps submitting junk).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canModerateMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const by = new Map<string | null, Acc>();

    const touch = (userId: string | null | undefined) => {
      const key = userId ?? null;
      let acc = by.get(key);
      if (!acc) {
        acc = {
          userId: key,
          spots: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          hidden: 0,
          zones: 0,
          routes: 0,
          reviews: 0,
          comments: 0,
          photos: 0,
          lastActive: 0,
        };
        by.set(key, acc);
      }
      return acc;
    };

    const spots = await db
      .collection<Spot>(COLLECTIONS.spots)
      .find({ mapId })
      .project({ createdBy: 1, moderation: 1, hidden: 1, createdAt: 1 })
      .toArray();

    for (const s of spots) {
      const acc = touch(s.createdBy);
      bump(acc, "spots", s.createdAt);
      if (s.hidden) bump(acc, "hidden", s.createdAt);
      if (s.moderation === "pending") bump(acc, "pending", s.createdAt);
      else if (s.moderation === "approved") bump(acc, "approved", s.createdAt);
      else if (s.moderation === "rejected") bump(acc, "rejected", s.createdAt);
    }

    const zones = await db
      .collection<Zone>(COLLECTIONS.zones)
      .find({ mapId })
      .project({ createdBy: 1, createdAt: 1 })
      .toArray();
    for (const z of zones) bump(touch(z.createdBy), "zones", z.createdAt);

    const routes = await db
      .collection<Route>(COLLECTIONS.routes)
      .find({ mapId })
      .project({ createdBy: 1, createdAt: 1 })
      .toArray();
    for (const r of routes) bump(touch(r.createdBy), "routes", r.createdAt);

    const spotIds = spots
      .slice(0, MAX_SPOTS_FOR_CONTENT)
      .map((s) => s._id as string);

    if (spotIds.length > 0) {
      const reviews = await db
        .collection<Review>(COLLECTIONS.reviews)
        .find({ spotId: { $in: spotIds } })
        .project({ user_fk: 1, date: 1 })
        .toArray();
      for (const rv of reviews) bump(touch(rv.user_fk), "reviews", rv.date);

      const photos = await db
        .collection<SpotPhoto>(COLLECTIONS.photos)
        .find({ spotId: { $in: spotIds } })
        .project({ uploader_fk: 1, date: 1 })
        .toArray();
      for (const p of photos) bump(touch(p.uploader_fk), "photos", p.date);

      const reviewIds = reviews.map((r) => r._id as string);
      if (reviewIds.length > 0) {
        const comments = await db
          .collection<ReviewComment>(COLLECTIONS.comments)
          .find({ reviewId: { $in: reviewIds } })
          .project({ user_fk: 1, date: 1 })
          .toArray();
        for (const c of comments) bump(touch(c.user_fk), "comments", c.date);
      }
    }

    const contributors: MapContributorEntry[] = [...by.values()]
      .map((a) => ({
        userId: a.userId,
        spots: a.spots,
        pending: a.pending,
        approved: a.approved,
        rejected: a.rejected,
        hidden: a.hidden,
        zones: a.zones,
        routes: a.routes,
        reviews: a.reviews,
        comments: a.comments,
        photos: a.photos,
        total: a.spots + a.zones + a.routes + a.reviews + a.comments + a.photos,
        lastActive: a.lastActive > 0 ? new Date(a.lastActive).toISOString() : null,
      }))
      .sort((a, b) => b.total - a.total || (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));

    return json({ contributors });
  });
}
import { NextResponse } from "next/server";
import { COLLECTIONS, getDb } from "@/lib/mongodb";
import { json, toObjectId } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import { serverClient } from "@/sanity/lib/client";
import { coverImageUrl } from "@/sanity/lib/images";
import { getServerSupabase } from "@/lib/supabase-server";
import type { Filter } from "mongodb";
import type {
  ProfileData,
  ProfileUser,
  Spot,
  Review,
  ReviewComment,
  SpotPhoto,
  ReviewVote,
} from "@/lib/types";

const SPOT_CAP = 100;
const REVIEW_CAP = 100;
const COMMENT_CAP = 100;
const PHOTO_CAP = 24;

interface MapMeta {
  _id: string;
  title: string;
  slug: string | null;
  description?: string;
  accentColor: string | null;
  ownerId?: string;
  coverImage?: { asset?: { _ref?: string } } | null;
}

function initialsOf(first: string, last: string, email: string | null): string {
  const a = first.trim();
  const b = last.trim();
  if (a) return ((a[0] || "") + (b[0] || "")).toUpperCase() || "?";
  if (email) return email.slice(0, 1).toUpperCase();
  return "?";
}

// GET /api/me  -> the signed-in user's profile details + their contributions.
export async function GET(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ error: "You must be signed in to view your profile." }, { status: 401 });
  }
  const userId = ctx.userId;

  // Owner details (from Supabase, when configured).
  let user: Omit<ProfileUser, "memberSince"> = {
    id: userId,
    email: null,
    firstName: "",
    lastName: "",
    displayName: userId.slice(0, 8),
    initials: "?",
  };
  let memberSince: string | null = null;
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user: sbUser },
    } = await sb.auth.getUser();
    if (sbUser) {
      const md: Record<string, unknown> = sbUser.user_metadata || {};
      const first = typeof md.first_name === "string" ? md.first_name : "";
      const last = typeof md.last_name === "string" ? md.last_name : "";
      const name = [first, last].filter(Boolean).join(" ").trim();
      user = {
        id: sbUser.id,
        email: sbUser.email ?? null,
        firstName: first,
        lastName: last,
        displayName: name || sbUser.email || user.displayName,
        initials: initialsOf(first, last, sbUser.email ?? null),
      };
      memberSince = sbUser.created_at ?? null;
    }
  }

  // Maps (for owned-map cards + resolving map titles on contributions).
  let maps: MapMeta[] = [];
  if (serverClient) {
    try {
      maps = await serverClient.fetch<MapMeta[]>(
        `*[_type == "map"]{ _id, title, "slug": slug.current, description, accentColor, ownerId, coverImage }`
      );
    } catch {
      maps = [];
    }
  }
  const mapById = new Map(maps.map((m) => [m._id, m]));
  const ownedMaps = maps
    .filter((m) => m.ownerId === userId)
    .sort((a, b) => a.title.localeCompare(b.title));

  let db;
  try {
    db = await getDb();
  } catch {
    db = null;
  }

  if (!db) {
    const fallback: ProfileData = {
      user: { ...user, memberSince: null },
      stats: { spots: 0, reviews: 0, comments: 0, photos: 0, votes: 0, helpfulReceived: 0, mapsOwned: ownedMaps.length },
      maps: ownedMaps.map((m) => ({ _id: m._id, title: m.title, slug: m.slug, description: m.description ?? "", accentColor: m.accentColor, spotCount: 0, coverUrl: coverImageUrl(m.coverImage) })),
      contributions: { spots: [], reviews: [], comments: [], photos: [] },
    };
    return json(fallback);
  }

  try {
    const spotsCol = db.collection<Spot>(COLLECTIONS.spots);
    const reviewsCol = db.collection<Review>(COLLECTIONS.reviews);
    const commentsCol = db.collection<ReviewComment>(COLLECTIONS.comments);
    const photosCol = db.collection<SpotPhoto>(COLLECTIONS.photos);
    const votesCol = db.collection<ReviewVote>(COLLECTIONS.votes);

    const [userSpots, userReviews, userComments, userPhotos, userVotes] =
      await Promise.all([
        spotsCol.find({ createdBy: userId }).sort({ createdAt: -1 }).limit(SPOT_CAP).toArray(),
        reviewsCol.find({ user_fk: userId }).sort({ date: -1 }).limit(REVIEW_CAP).toArray(),
        commentsCol.find({ user_fk: userId }).sort({ date: -1 }).limit(COMMENT_CAP).toArray(),
        photosCol.find({ uploader_fk: userId }).sort({ date: -1 }).limit(PHOTO_CAP).toArray(),
        votesCol.find({ userId }).toArray(),
      ]);

    // Owned map spot counts (excluding rejected spots).
    const countsByMap = new Map<string, number>();
    const countRows: { _id: string; n: number }[] = (await spotsCol
      .aggregate([
        { $match: { moderation: { $ne: "rejected" } } },
        { $group: { _id: "$mapId", n: { $sum: 1 } } },
      ])
      .toArray()) as unknown as { _id: string; n: number }[];
    countRows.forEach((row) => countsByMap.set(row._id, row.n));

    // Resolve spot names + their maps for reviews/comments/photos.
    const spotRefIds = new Set<string>();
    userReviews.forEach((r) => spotRefIds.add(String(r.spotId)));
    userComments.forEach((c) => spotRefIds.add(String(c.reviewId)));
    userPhotos.forEach((p) => spotRefIds.add(String(p.spotId)));

    // Reviews referenced by the user's comments (to reach the spot).
    const commentReviewIds = userComments
      .map((c) => toObjectId(String(c.reviewId)))
      .filter((oid): oid is NonNullable<typeof oid> => Boolean(oid));
    const referencedReviews = commentReviewIds.length > 0
      ? await reviewsCol
          .find({ _id: { $in: commentReviewIds } } as unknown as Filter<Review>)
          .toArray()
      : [];
    const reviewByHex = new Map<string, Review>();
    referencedReviews.forEach((r) => reviewByHex.set(r._id!.toString(), r));
    userComments.forEach((c) => {
      const r = reviewByHex.get(String(c.reviewId));
      if (r) spotRefIds.add(String(r.spotId));
    });

    const spotHexToObj = new Map<string, Spot>();
    const spotOids = [...spotRefIds]
      .map((hex) => ({ hex, oid: toObjectId(hex) }))
      .filter((e): e is { hex: string; oid: NonNullable<ReturnType<typeof toObjectId>> } => Boolean(e.oid));
    if (spotOids.length > 0) {
      const found = await spotsCol
        .find({ _id: { $in: spotOids.map((e) => e.oid) } } as unknown as Filter<Spot>)
        .toArray();
      const byHex = new Map(found.map((s) => [s._id!.toString(), s]));
      for (const { hex } of spotOids) {
        const spot = byHex.get(hex);
        if (spot) spotHexToObj.set(hex, spot);
      }
    }

    const spotMeta = (hex: string): { name: string; mapId: string } | null => {
      const s = spotHexToObj.get(hex);
      if (!s) return null;
      return {
        name: s.name,
        mapId: s.mapId,
      };
    };

    // Helpful votes received = votes on the user's reviews.
    const reviewHexSet = new Set(
      userReviews.map((r) => (r._id ? r._id.toString() : ""))
    );
    const helpfulReceived = userVotes.filter((v) =>
      reviewHexSet.has(String(v.reviewId))
    ).length;

    // Earliest contribution is a fallback "joined" date when the auth record
    // doesn't expose one.
    const earliest = [
      ...userSpots.map((s) => s.createdAt),
      ...userReviews.map((r) => r.date),
      ...userComments.map((c) => c.date),
      ...userPhotos.map((p) => p.date),
    ].sort()[0] || null;

    const spots = userSpots.map((s) => {
      const map = mapById.get(s.mapId);
      return {
        _id: s._id!.toString(),
        mapId: s.mapId,
        mapTitle: map?.title ?? "Unknown map",
        mapSlug: map?.slug ?? null,
        name: s.name,
        city: s.city,
        status: s.status,
        moderation: s.moderation,
        marker: s.marker ?? null,
        markerColor: s.markerColor ?? null,
        createdAt: s.createdAt,
      };
    });

    const reviews = userReviews.map((r) => {
      const meta = spotMeta(String(r.spotId));
      const map = meta ? mapById.get(meta.mapId) : null;
      return {
        _id: r._id!.toString(),
        spotId: String(r.spotId),
        spotName: meta?.name ?? "Removed spot",
        mapId: meta?.mapId ?? "",
        mapTitle: map?.title ?? "",
        mapSlug: map?.slug ?? null,
        score: r.score,
        review: r.review,
        date: r.date,
      };
    });

    const comments = userComments.map((c) => {
      const r = reviewByHex.get(String(c.reviewId));
      const meta = r ? spotMeta(String(r.spotId)) : null;
      return {
        _id: c._id!.toString(),
        spotId: meta ? String(r!.spotId) : "",
        spotName: meta?.name ?? "Removed spot",
        reviewText: r?.review ?? "",
        text: c.text,
        date: c.date,
      };
    });

    const photos = userPhotos.map((p) => {
      const meta = spotMeta(String(p.spotId));
      const map = meta ? mapById.get(meta.mapId) : null;
      return {
        _id: p._id!.toString(),
        spotId: String(p.spotId),
        spotName: meta?.name ?? "Removed spot",
        mapId: meta?.mapId ?? "",
        mapSlug: map?.slug ?? null,
        dataUrl: p.dataUrl,
        date: p.date,
      };
    });

    const data: ProfileData = {
      user: {
        ...user,
        memberSince: memberSince ?? earliest,
      },
      stats: {
        spots: userSpots.length,
        reviews: userReviews.length,
        comments: userComments.length,
        photos: userPhotos.length,
        votes: userVotes.length,
        helpfulReceived,
        mapsOwned: ownedMaps.length,
      },
      maps: ownedMaps.map((m) => ({
        _id: m._id,
        title: m.title,
        slug: m.slug,
        description: m.description ?? "",
        accentColor: m.accentColor,
        spotCount: countsByMap.get(m._id) ?? 0,
        coverUrl: coverImageUrl(m.coverImage),
      })),
      contributions: { spots, reviews, comments, photos },
    };

    return json(data);
  } catch (err) {
    console.error("GET /api/me failed:", err);
    return NextResponse.json(
      { error: "Could not load your contributions." },
      { status: 500 }
    );
  }
}
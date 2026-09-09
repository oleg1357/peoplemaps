"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { fetchProfile } from "@/lib/api-client";
import type { ProfileData } from "@/lib/types";
import {
  getMarkerColor,
  resolveMarker,
  DEFAULT_MARKER,
} from "@/lib/markers-data";
import { Rating } from "@/components/Rating";
import {
  IconCamera,
  IconComment,
  IconHeart,
  IconLink,
  IconList,
  IconMapMarker,
  IconThumbsUp,
} from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function mapHref(map: { mapSlug?: string | null; mapId?: string; spot?: string } | null) {
  if (map?.mapSlug) {
    return map?.spot
      ? `/map/${encodeURIComponent(map.mapSlug)}?spot=${encodeURIComponent(map.spot)}`
      : `/map/${encodeURIComponent(map.mapSlug)}`;
  }
  if (map?.mapId) {
    const spot = map?.spot ? `&spot=${encodeURIComponent(map.spot)}` : "";
    return `/map?map=${encodeURIComponent(map.mapId)}${spot}`;
  }
  return "/map";
}

function formatDay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Value + icon for the stat pills shown in the dashboard header.
export function profileStatItems(data: ProfileData): {
  label: string;
  value: number;
  icon: (props: { size?: number }) => ReactNode;
}[] {
  return [
    { label: "Maps", value: data.stats.mapsOwned, icon: IconList },
    { label: "Spots", value: data.stats.spots, icon: IconMapMarker },
    { label: "Reviews", value: data.stats.reviews, icon: IconThumbsUp },
    { label: "Replies", value: data.stats.comments, icon: IconComment },
    { label: "Photos", value: data.stats.photos, icon: IconCamera },
    { label: "Helpful", value: data.stats.helpfulReceived, icon: IconHeart },
  ];
}

export default function ProfilePanel() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<
    "maps" | "spots" | "reviews" | "comments" | "photos"
  >("spots");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profile = await fetchProfile();
      setData(profile);
    } catch (err) {
      setError(
        (err as Error).message?.includes("not-configured")
          ? "The database is not configured."
          : (err as Error).message || "Could not load your profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const sections = [
    { key: "spots" as const, label: `Spots (${data?.stats.spots ?? 0})` },
    { key: "reviews" as const, label: `Reviews (${data?.stats.reviews ?? 0})` },
    { key: "comments" as const, label: `Replies (${data?.stats.comments ?? 0})` },
    { key: "photos" as const, label: `Photos (${data?.stats.photos ?? 0})` },
    { key: "maps" as const, label: `Maps (${data?.stats.mapsOwned ?? 0})` },
  ];

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && <p className="text-[13px] text-muted-foreground">Loading your contributions…</p>}

      {!loading && !error && data && (
        <>
          {data.maps.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-[17px] text-ink">Maps I run</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.maps.map((m) => {
                  const href = m.slug
                    ? `/map/${encodeURIComponent(m.slug)}`
                    : `/map?map=${encodeURIComponent(m._id)}`;
                  const accent = getMarkerColor(m.accentColor, DEFAULT_MARKER.color);
                  return (
                    <Card
                      key={m._id}
                      className="hover:shadow-md"
                      style={{ borderTop: `4px solid ${accent}` }}
                    >
                      {m.coverUrl && (
                        <img src={m.coverUrl} alt={m.title} className="h-24 w-full object-cover" />
                      )}
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <h3 className="m-0 text-[15px] text-ink">{m.title}</h3>
                        {m.description && (
                          <p className="m-0 text-[13px] text-muted-foreground">
                            {m.description}
                          </p>
                        )}
                        <p className="m-0 inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                          <IconMapMarker size={13} /> {m.spotCount} spot
                          {m.spotCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex gap-3 p-4 pt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="px-0"
                          title="Copy map link"
                          onClick={async (e) => {
                            e.preventDefault();
                            await copyLink(window.location.origin + href);
                          }}
                        >
                          <IconLink size={14} /> Copy
                        </Button>
                        <Link
                          href={`/dashboard?map=${encodeURIComponent(m._id)}`}
                          className={buttonVariants({ variant: "ghost", size: "sm", className: "px-0" })}
                          prefetch={false}
                        >
                          Manage
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <Tabs
              value={activeSection}
              onValueChange={(v) => setActiveSection(v as typeof activeSection)}
            >
              <TabsList variant="line" className="mb-3.5 w-full justify-start overflow-x-auto">
                {sections.map((s) => (
                  <TabsTrigger key={s.key} value={s.key} className="px-3 text-[13px]">
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {activeSection === "spots" && <SpotContributions data={data} />}
            {activeSection === "reviews" && <ReviewContributions data={data} />}
            {activeSection === "comments" && <CommentContributions data={data} />}
            {activeSection === "photos" && <PhotoContributions data={data} />}
            {activeSection === "maps" && (
              <div className="py-6 text-center">
                {data.maps.length === 0 ? (
                  <p className="text-muted-foreground">
                    You don&apos;t run any maps yet. Create one from{" "}
                    <Link href="/dashboard" prefetch={false}>your dashboard</Link>.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Your maps are listed above. Manage spots and settings in{" "}
                    <Link href="/dashboard" prefetch={false}>your dashboard</Link>.
                  </p>
                )}
              </div>
            )}
          </section>

          {copied && (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Link copied to clipboard.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SpotContributions({ data }: { data: ProfileData }) {
  const spots = data.contributions.spots;
  if (spots.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted-foreground">
          You haven&apos;t added any spots yet. Head to the{" "}
          <Link href="/map" prefetch={false}>map</Link> to add your first one.
        </p>
      </div>
    );
  }
  return (
    <ul className="flex list-none flex-col gap-2.5 p-0">
      {spots.map((s) => {
        const base = resolveMarker(s.marker);
        const color = getMarkerColor(s.markerColor, base.color);
        return (
          <li
            key={s._id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span
              className="pm-marker"
              style={{ width: 28, height: 28, background: color }}
            >
              <span>{base.emoji}</span>
            </span>
            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-ink">{s.name}</span>
                {s.moderation && (
                  <span className={`admin-spot-chip ${s.moderation}`}>
                    {s.moderation}
                  </span>
                )}
                {s.status && (
                  <span className={`status-chip ${s.status}`}>{s.status}</span>
                )}
              </div>
              <div className="text-muted-foreground">
                {s.city || "No city"} · {s.mapTitle}
              </div>
            </div>
            <div className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDay(s.createdAt)}
            </div>
            <Link
              href={mapHref({ mapSlug: s.mapSlug, spot: s._id })}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              prefetch={false}
            >
              View
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ReviewContributions({ data }: { data: ProfileData }) {
  const reviews = data.contributions.reviews;
  if (reviews.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted-foreground">You haven&apos;t reviewed any spots yet.</p>
      </div>
    );
  }
  return (
    <ul className="flex list-none flex-col gap-2.5 p-0">
      {reviews.map((r) => (
        <li
          key={r._id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="min-w-[200px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={mapHref({ mapSlug: r.mapSlug, mapId: r.mapId, spot: r.spotId })}
                className="text-sm font-bold text-ink hover:text-green"
              >
                {r.spotName}
              </a>
              <span className="review-score">{r.score}/5</span>
              <Rating value={r.score} readOnly small />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{r.mapTitle}</div>
            {r.review ? (
              <p className="mt-1.5 text-[13px] leading-snug text-ink">{r.review}</p>
            ) : (
              <p className="mt-1.5 text-[13px] italic text-muted-foreground">No comment.</p>
            )}
          </div>
          <div className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(r.date)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommentContributions({ data }: { data: ProfileData }) {
  const comments = data.contributions.comments;
  if (comments.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted-foreground">You haven&apos;t replied to any reviews yet.</p>
      </div>
    );
  }
  return (
    <ul className="flex list-none flex-col gap-2.5 p-0">
      {comments.map((c) => (
        <li
          key={c._id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="min-w-[200px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-ink">{c.spotName}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Replied to: {c.reviewText ? `“${c.reviewText.slice(0, 80)}”` : "a review"}
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-ink">{c.text}</p>
          </div>
          <div className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(c.date)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PhotoContributions({ data }: { data: ProfileData }) {
  const photos = data.contributions.photos;
  if (photos.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted-foreground">You haven&apos;t uploaded any photos yet.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <Link
            key={p._id}
            href={mapHref({ mapSlug: p.mapSlug, mapId: p.mapId, spot: p.spotId })}
            className="relative block aspect-square overflow-hidden rounded-lg border border-border"
            prefetch={false}
          >
            <img src={p.dataUrl} alt={p.spotName} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-semibold text-white">
              {p.spotName}
            </span>
          </Link>
        ))}
      </div>
      {data.stats.photos > photos.length && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Showing your {photos.length} most recent photos.
        </p>
      )}
    </div>
  );
}
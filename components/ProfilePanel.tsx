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

function mapHref(map: { mapSlug?: string | null; mapId?: string } | null) {
  return map?.mapSlug
    ? `/map/${encodeURIComponent(map.mapSlug)}`
    : map?.mapId
      ? `/map?map=${encodeURIComponent(map.mapId)}`
      : "/map";
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
    <div className="profile-panel">
      {error && <p className="auth-error">{error}</p>}

      {loading && <p className="muted profile-note">Loading your contributions…</p>}

      {!loading && !error && data && (
        <>
          {data.maps.length > 0 && (
            <section className="profile-section">
              <div className="profile-title">
                <h2>Maps I run</h2>
              </div>
              <div className="profile-maps-grid">
                {data.maps.map((m) => {
                  const href = m.slug
                    ? `/map/${encodeURIComponent(m.slug)}`
                    : `/map?map=${encodeURIComponent(m._id)}`;
                  const accent = getMarkerColor(m.accentColor, DEFAULT_MARKER.color);
                  return (
                    <div
                      key={m._id}
                      className="profile-map-card"
                      style={{ borderTop: `4px solid ${accent}` }}
                    >
                      {m.coverUrl && (
                        <img src={m.coverUrl} alt={m.title} className="profile-map-card-cover" />
                      )}
                      <div className="profile-map-card-body">
                        <h3>{m.title}</h3>
                        {m.description && (
                          <p className="profile-map-card-desc muted">{m.description}</p>
                        )}
                        <p className="muted">
                          <IconMapMarker size={13} /> {m.spotCount} spot
                          {m.spotCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="profile-map-card-actions">
                        <a
                          href={href}
                          className="link-btn"
                          onClick={async (e) => {
                            e.preventDefault();
                            await copyLink(window.location.origin + href);
                          }}
                          title="Copy map link"
                        >
                          <IconLink size={14} /> Copy
                        </a>
                        <Link href="/dashboard" className="link-btn">
                          Manage
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="profile-section">
            <div className="profile-tabs">
              {sections.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`profile-tab ${activeSection === s.key ? "active" : ""}`}
                  onClick={() => setActiveSection(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {activeSection === "spots" && (
              <SpotContributions data={data} />
            )}
            {activeSection === "reviews" && (
              <ReviewContributions data={data} />
            )}
            {activeSection === "comments" && (
              <CommentContributions data={data} />
            )}
            {activeSection === "photos" && (
              <PhotoContributions data={data} />
            )}
            {activeSection === "maps" && (
              <div className="profile-contrib empty">
                {data.maps.length === 0 ? (
                  <p className="empty-state">
                    You don&apos;t run any maps yet. Create one from{" "}
                    <Link href="/dashboard">your dashboard</Link>.
                  </p>
                ) : (
                  <p className="muted">
                    Your maps are listed above. Manage spots and settings in{" "}
                    <Link href="/dashboard">your dashboard</Link>.
                  </p>
                )}
              </div>
            )}
          </section>

          {copied && <p className="muted profile-note">Link copied to clipboard.</p>}
        </>
      )}
    </div>
  );
}

function SpotContributions({ data }: { data: ProfileData }) {
  const spots = data.contributions.spots;
  if (spots.length === 0) {
    return (
      <div className="profile-contrib empty">
        <p className="empty-state">
          You haven&apos;t added any spots yet. Head to the{" "}
          <Link href="/map">map</Link> to add your first one.
        </p>
      </div>
    );
  }
  return (
    <ul className="profile-list">
      {spots.map((s) => {
        const base = resolveMarker(s.marker);
        const color = getMarkerColor(s.markerColor, base.color);
        return (
          <li key={s._id} className="profile-row">
            <span
              className="pm-marker"
              style={{ width: 28, height: 28, background: color }}
            >
              <span>{base.emoji}</span>
            </span>
            <div className="profile-row-body">
              <div className="profile-row-title">
                <span className="profile-row-name">{s.name}</span>
                {s.moderation && (
                  <span className={`admin-spot-chip ${s.moderation}`}>
                    {s.moderation}
                  </span>
                )}
                {s.status && (
                  <span className={`status-chip ${s.status}`}>{s.status}</span>
                )}
              </div>
              <div className="muted">
                {s.city || "No city"} · {s.mapTitle}
              </div>
            </div>
            <div className="profile-row-date muted">
              {formatDay(s.createdAt)}
            </div>
            <Link href={mapHref({ mapSlug: s.mapSlug })} className="link-btn">
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
      <div className="profile-contrib empty">
        <p className="empty-state">
          You haven&apos;t reviewed any spots yet.
        </p>
      </div>
    );
  }
  return (
    <ul className="profile-list">
      {reviews.map((r) => (
        <li key={r._id} className="profile-row">
          <div className="profile-row-body">
            <div className="profile-row-title">
              <a
                href={mapHref({ mapSlug: r.mapSlug, mapId: r.mapId })}
                className="profile-row-name link"
              >
                {r.spotName}
              </a>
              <span className="review-score">{r.score}/5</span>
              <Rating value={r.score} readOnly small />
            </div>
            <div className="muted profile-row-map">{r.mapTitle}</div>
            {r.review ? (
              <p className="profile-row-text">{r.review}</p>
            ) : (
              <p className="muted italic">No comment.</p>
            )}
          </div>
          <div className="profile-row-date muted">{formatDay(r.date)}</div>
        </li>
      ))}
    </ul>
  );
}

function CommentContributions({ data }: { data: ProfileData }) {
  const comments = data.contributions.comments;
  if (comments.length === 0) {
    return (
      <div className="profile-contrib empty">
        <p className="empty-state">
          You haven&apos;t replied to any reviews yet.
        </p>
      </div>
    );
  }
  return (
    <ul className="profile-list">
      {comments.map((c) => (
        <li key={c._id} className="profile-row">
          <div className="profile-row-body">
            <div className="profile-row-title">
              <span className="profile-row-name">{c.spotName}</span>
            </div>
            <div className="muted profile-row-map">
              Replied to: {c.reviewText ? `“${c.reviewText.slice(0, 80)}”` : "a review"}
            </div>
            <p className="profile-row-text">{c.text}</p>
          </div>
          <div className="profile-row-date muted">{formatDay(c.date)}</div>
        </li>
      ))}
    </ul>
  );
}

function PhotoContributions({ data }: { data: ProfileData }) {
  const photos = data.contributions.photos;
  if (photos.length === 0) {
    return (
      <div className="profile-contrib empty">
        <p className="empty-state">
          You haven&apos;t uploaded any photos yet.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="profile-photos-grid">
        {photos.map((p) => (
          <Link
            key={p._id}
            href={mapHref({ mapSlug: p.mapSlug, mapId: p.mapId })}
            className="profile-photo"
          >
            <img src={p.dataUrl} alt={p.spotName} />
            <span className="profile-photo-caption">{p.spotName}</span>
          </Link>
        ))}
      </div>
      {data.stats.photos > photos.length && (
        <p className="muted profile-note">
          Showing your {photos.length} most recent photos.
        </p>
      )}
    </div>
  );
}

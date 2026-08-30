"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getUser,
  getReviewsByUser,
  getPhotosByUser,
  getNewSpots,
  getAllPlaces,
} from "@/lib/store";
import type { User, Review, NewSpot } from "@/lib/data";
import { Rating } from "@/components/Rating";
import { IconUser } from "@/components/icons";

interface StoreSummary {
  id: number;
  name: string;
  street: string;
  city: string;
  review?: Review;
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (Number.isFinite(id)) setUser(getUser(String(id)));
  }, [id]);

  if (!user) {
    return (
      <div className="page">
        <p className="empty-state" style={{ paddingTop: "3em" }}>
          User not found.
        </p>
      </div>
    );
  }

  const reviews = getReviewsByUser(user.id);
  const places = getAllPlaces();
  const spotMap: Record<number, StoreSummary> = {};
  reviews.forEach((r) => {
    const s = places.find((st) => st.id === r.spot_fk);
    if (s) {
      spotMap[s.id] = {
        id: s.id,
        name: s.name,
        street: s.street,
        city: s.city,
        review: r,
      };
    }
  });
  const added = getNewSpots().filter((d) => d.user_fk === user.id);
  const addedSpots = added.map((d: NewSpot) => ({
    id: d.id,
    name: d.placeName,
    street: d.address,
    city: d.city,
  }));
  const photoReviews = getPhotosByUser(user.id);
  const photoSpotNames = photoReviews.map((p) => {
    const s = places.find((st) => st.id === p.spot_fk);
    return s ? s.name : "a spot";
  });

  return (
    <div className="page">
      <div className="flex auth-layout" style={{ height: "100%" }}>
        <div className="profile-box">
          <div className="circle">
            <IconUser size={48} />
          </div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {reviews.length} review{reviews.length === 1 ? "" : "s"} ·{" "}
            {addedSpots.length} added
          </p>
          <Link
            href="/"
            className="action-btn2 logout-btn"
            style={{ textDecoration: "none" }}
          >
            Back to map
          </Link>
        </div>
        <div className="profile-content">
          <div className="profile-title">
            <h2>Places found (reviews)</h2>
          </div>
          <div className="user-reviews">
            {Object.values(spotMap).map((s) => (
              <div className="user-review-card" key={s.id}>
                <Link href={`/?loc=${s.id}`} className="user-review-name">
                  {s.name}
                </Link>
                <span className="muted">
                  · {s.street}, {s.city}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{s.review?.score}</span>
                  <Rating value={s.review?.score ?? 0} readOnly small />
                </div>
                {s.review?.review ? (
                  <p className="user-review-text">{s.review.review}</p>
                ) : (
                  <p className="muted">No comment.</p>
                )}
              </div>
            ))}
            {Object.keys(spotMap).length === 0 && (
              <p className="empty-state">No reviews yet.</p>
            )}
          </div>

          {addedSpots.length > 0 && (
            <>
              <div className="profile-title" style={{ marginTop: 24 }}>
                <h2>Places added</h2>
              </div>
              <div className="user-reviews">
                {addedSpots.map((s) => (
                  <div className="user-review-card" key={s.id}>
                    <span className="user-review-name">{s.name}</span>
                    <span className="muted">
                      · {s.street}, {s.city}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {photoReviews.length > 0 && (
            <>
              <div className="profile-title" style={{ marginTop: 24 }}>
                <h2>Latest photos</h2>
              </div>
              <div className="user-photos">
                {photoReviews.map((p, i) => (
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt={`${photoSpotNames[i]} photo`}
                    className="user-photo"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
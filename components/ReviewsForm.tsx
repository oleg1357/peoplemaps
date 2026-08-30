"use client";

import { useState } from "react";
import { addReview, deleteReview, updateReview } from "@/lib/store";
import { Rating } from "./Rating";

interface ReviewsFormProps {
  spotId: number;
  userId?: string | null;
  initial?: { id: number; review: string; score: number };
  onDone: () => void;
}

export function ReviewsForm({
  spotId,
  userId,
  initial,
  onDone,
}: ReviewsFormProps) {
  const editing = Boolean(initial);
  const [score, setScore] = useState(initial?.score ?? 0);
  const [review, setReview] = useState(initial?.review ?? "");

  const submit = () => {
    if (editing && initial) {
      updateReview(initial.id, review, score);
    } else {
      addReview(spotId, score, review, userId);
    }
    onDone();
  };

  const remove = () => {
    if (editing && initial) {
      deleteReview(initial.id);
    }
    onDone();
  };

  return (
    <div id="add-section" style={{ position: "static", width: "auto" }}>
      <div className="review">
        <div className="middle">
          <label style={{ fontWeight: 600, display: "block" }}>
            How would you rate the spot?
          </label>
          <Rating value={score} onChange={setScore} color="#F5A841" />
        </div>
        <div>
          <textarea
            id="review-text"
            placeholder="Any tips? General review on the spot"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button className="action-btn" onClick={submit}>
            {editing ? "Update review" : "Add review"}
          </button>
          {editing && (
            <button className="action-btn2" onClick={remove}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
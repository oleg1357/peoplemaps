"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { saveToSaved } from "@/lib/store";
import { IconHeart } from "./icons";

interface FavouritesFormProps {
  spotId: number;
  onDone: () => void;
}

export function FavouritesForm({ spotId, onDone }: FavouritesFormProps) {
  const { userId } = useAuth();
  const [note, setNote] = useState("");

  const submit = () => {
    saveToSaved(userId, spotId, note);
    onDone();
  };

  return (
    <div id="add-section" style={{ position: "static", width: "auto" }}>
      <div className="review">
        <div>
          <h2 style={{ marginTop: 0 }}>Add to favourites</h2>
          <p className="italic">Psss! Only you will be able to see it.</p>
          <textarea
            id="review-text"
            placeholder="Write personal note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="action-btn" onClick={submit}>
            <IconHeart size={16} color="#D90368" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
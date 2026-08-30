"use client";

import { useRef, useState } from "react";
import { addSpotPhoto } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";

interface Photo {
  id: number;
  dataUrl: string;
}

const MAX_PHOTOS = 3;

export function PhotosSection({
  spotId,
  photos,
  onUploaded,
}: {
  spotId: number;
  photos: Photo[];
  onUploaded: () => void;
}) {
  const { userId } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (file: File) => {
    if (busy) return;
    if (photos.length >= MAX_PHOTOS) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      addSpotPhoto(spotId, String(reader.result), userId);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="photos-section">
      {photos.length > 0 && (
        <div className="photos-grid">
          {photos.map((p) => (
            <img key={p.id} src={p.dataUrl} alt="spot photo" className="spot-photo" />
          ))}
        </div>
      )}
      <div className="photos-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="photo-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            className="photo-upload-btn"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {photos.length === 0 ? "Add a photo" : "Add photo"}
          </button>
        )}
        {photos.length >= MAX_PHOTOS && (
          <span className="muted photo-limit">Max {MAX_PHOTOS} photos</span>
        )}
      </div>
    </div>
  );
}
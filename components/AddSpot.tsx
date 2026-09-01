"use client";

import { useEffect, useRef, useState } from "react";
import { useMapEvents } from "react-leaflet";
import { addNewLocation } from "@/lib/store";
import { Rating } from "./Rating";
import { IconCheck, IconMapMarker } from "./icons";
export { addMarkerIcon } from "@/lib/icons";

export function AddSpotMapHandler({
  enabled,
  onPlace,
}: {
  enabled: boolean;
  onPlace: (latlng: [number, number]) => void;
}) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  useMapEvents({
    click: (e) => {
      if (enabledRef.current) {
        onPlace([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export function AddSpotPanel({
  draft,
  userId,
  onCancel,
  onPosted,
}: {
  draft: [number, number] | null;
  userId?: string | null;
  onCancel: () => void;
  onPosted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [score, setScore] = useState(0);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (draft) {
      setOpen(true);
      setSuccess(false);
      setError("");
    }
  }, [draft]);

  const clearForm = () => {
    setPlaceName("");
    setAddress("");
    setCity("");
    setZip("");
    setScore(0);
    setReview("");
    setError("");
  };

  const submit = () => {
    if (!draft) {
      setError("Click on the map to pick a location first.");
      return;
    }
    const zipNum = Number(zip);
    if (!placeName.trim()) {
      setError("Please enter the place name.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter the address.");
      return;
    }
    if (!city.trim()) {
      setError("Please enter the city.");
      return;
    }
    if (!zip.trim() || !Number.isFinite(zipNum)) {
      setError("Please enter a valid post code.");
      return;
    }
    addNewLocation(
      {
        placeName: placeName.trim(),
        address: address.trim(),
        city: city.trim(),
        zip: zipNum,
        lat: draft[0],
        lng: draft[1],
        review,
        score,
      },
      userId
    );
    setOpen(false);
    setSuccess(true);
    clearForm();
    onPosted();
  };

  return (
    <>
      {!draft && !success && (
        <div id="add-hint">
          <span className="add-hint-icon">
            <IconMapMarker size={18} />
          </span>
          Click anywhere on the map to add a new spot
        </div>
      )}
      {success && (
        <div id="add-hint" className="success">
          <IconCheck size={18} />
          Location added!
        </div>
      )}
      {open && draft && (
        <div className="new-box" id="details">
          <button type="button" className="close-btn" onClick={() => setOpen(false)}>
            Close
          </button>
          <h3 className="title">Add new spot</h3>
          {error && <p className="auth-error form-error">{error}</p>}
          <div className="pick-row">
            <span className="pick-label">Location</span>
            <code>
              {draft[0].toFixed(5)}, {draft[1].toFixed(5)}
            </code>
            <button type="button" className="link-btn" onClick={() => setOpen(false)}>
              Change
            </button>
          </div>
          <p className="pick-note">
            The marker is placed — click anywhere else on the map to move it.
          </p>
          <div>
            <div className="field">
              <label>Place name</label>
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="e.g. Falkoner Corner"
              />
            </div>
            <div className="field">
              <label>Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Fælledvej 19"
              />
            </div>
            <div className="flex field-row">
              <div className="field" style={{ flex: 1 }}>
                <label>City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. København N"
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Post code</label>
                <input
                  type="number"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="e.g. 2200"
                />
              </div>
            </div>
            <div className="middle">
              <label style={{ fontWeight: 600, display: "block" }}>
                How would you rate the spot?
              </label>
              <Rating value={score} onChange={setScore} color="#F5A841" />
            </div>
            <textarea
              id="review-text"
              placeholder="Any tips? General review on the spot"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <div className="form-actions">
              <button type="button" className="action-btn" onClick={submit}>
                Post spot
              </button>
              <button type="button" className="action-btn2" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
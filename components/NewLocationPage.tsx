"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  getAllPlaceMarkers,
  addNewLocation,
  addReview,
} from "@/lib/store";
import type { SpotMarker } from "@/lib/data";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { tileLayer } from "@/lib/tiles";
import { Rating } from "./Rating";
import { IconCheck, IconMapMarker } from "./icons";
import { SpotTooltip } from "./SpotTooltip";

const CENTER: [number, number] = [55.6761, 12.5683];
const ZOOM = 12;

import { placeIcon, markerIcon } from "@/lib/icons";

function MapClickHandler({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click: onClick,
  });
  return null;
}

function PlacesMap() {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const tiles = tileLayer(theme);
  const [places, setPlaces] = useState<SpotMarker[]>(() => getAllPlaceMarkers());
  const [picked, setPicked] = useState<SpotMarker | null>(null);
  const [score, setScore] = useState(0);
  const [review, setReview] = useState("");

  const submit = () => {
    if (!picked) return;
    addReview(picked.id, score, review, userId);
    setPicked(null);
    setScore(0);
    setReview("");
    setPlaces(getAllPlaceMarkers());
  };

  return (
    <div className="map-container">
      {picked && (
        <div id="details">
          <div className="details-top">
            <button type="button" className="close-btn" onClick={() => setPicked(null)}>
              Close
            </button>
            <h2 style={{ margin: 0 }}>
              {picked.brand} {picked.street}
            </h2>
          </div>
          <div id="details-content">
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
              <button type="button" className="action-btn" onClick={submit}>
                Add review
              </button>
            </div>
          </div>
        </div>
      )}
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        zoomSnap={0.5}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxZoom={tiles.maxZoom}
        />
        {places.map((s) => (
          <Marker
            key={s.id}
            position={s.latlng}
            icon={placeIcon}
            eventHandlers={{ click: () => setPicked(s) }}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              <SpotTooltip
                name={s.brand}
                street={s.street}
                city={s.city}
                hint="Click to add review"
              />
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function NewLocationMap() {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const tiles = tileLayer(theme);
  const [panelOpen, setPanelOpen] = useState(false);
  const [marker, setMarker] = useState<[number, number] | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [score, setScore] = useState(0);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const addMarker = (e: L.LeafletMouseEvent) => {
    setMarker([e.latlng.lat, e.latlng.lng]);
    setPanelOpen(true);
    setSuccess(false);
    setError("");
  };

  const clearForm = () => {
    setPlaceName("");
    setAddress("");
    setCity("");
    setZip("");
    setScore(0);
    setReview("");
    setError("");
  };

  const resetForm = () => {
    setPanelOpen(false);
    setMarker(null);
    setSuccess(false);
    clearForm();
  };

  const submit = () => {
    if (!marker) {
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
        lat: marker[0],
        lng: marker[1],
        review,
        score,
      },
      userId
    );
    setPanelOpen(false);
    setSuccess(true);
    clearForm();
  };

  return (
    <div className="map-container">
      {!marker && !success && (
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
      {panelOpen && marker && (
        <div className="new-box" id="details">
          <button type="button" className="close-btn" onClick={() => setPanelOpen(false)}>
            Close
          </button>
          <h3 className="title">Add new spot</h3>
          {error && <p className="auth-error form-error">{error}</p>}
          <div className="pick-row">
            <span className="pick-label">Location</span>
            <code>
              {marker[0].toFixed(5)}, {marker[1].toFixed(5)}
            </code>
            <button type="button" className="link-btn" onClick={() => setPanelOpen(false)}>
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
              <button type="button" className="action-btn2" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        zoomSnap={0.5}
        style={{ height: "100%", width: "100%" }}
      >
        <MapClickHandler onClick={addMarker} />
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxZoom={tiles.maxZoom}
        />
        {marker !== null && (
          <Marker position={marker} icon={markerIcon}>
            <Tooltip permanent direction="top" offset={[0, -16]}>
              <SpotTooltip
                name={success ? "Location added!" : "New spot"}
                hint="Click anywhere to move"
              />
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export function NewLocationPage() {
  const [view, setView] = useState<"new" | "places">("new");

  return (
    <div>
      <div id="new-buttons" className="buttons">
        <div className="toggle-group">
          <button
            className={`toggle-btn ${view === "new" ? "active view-active" : ""}`}
            onClick={() => setView("new")}
          >
            New location
          </button>
          <button
            className={`toggle-btn ${view === "places" ? "active view-active" : ""}`}
            onClick={() => setView("places")}
          >
            See places
          </button>
        </div>
      </div>
      {view === "places" ? <PlacesMap /> : <NewLocationMap />}
    </div>
  );
}
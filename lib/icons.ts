import L from "leaflet";

const PIN_URL = "https://i.ibb.co/hL2mS5V/pin-3.png";
const PIN_ALT_URL = "https://i.ibb.co/Jp8FCPC/pin-4.png";

export const spotIcon = L.icon({
  iconUrl: PIN_URL,
  iconSize: [40, 40],
  iconAnchor: [30, 30],
});

export const placeIcon = L.icon({
  iconUrl: PIN_ALT_URL,
  iconSize: [40, 40],
  iconAnchor: [30, 30],
});

export const markerIcon = L.icon({
  iconUrl: PIN_URL,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export const addMarkerIcon = L.icon({
  iconUrl: PIN_URL,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export const draftIcon = L.divIcon({
  className: "cluster-icon",
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#f0ad00;border:3px solid #fff"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export const userIcon = L.divIcon({
  className: "userLocation",
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#2986ce;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

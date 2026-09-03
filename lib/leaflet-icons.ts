import L from "leaflet";

export const userIcon = L.divIcon({
  className: "userLocation",
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#2986ce;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

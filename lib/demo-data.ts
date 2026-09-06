// Demo-mode seed data. Used only when the real backend (MongoDB + Sanity +
// Supabase) is not configured — it backs the README-promised localStorage demo
// experience. The shapes mirror the API payloads so the UI is identical in both
// modes (see lib/demo-store.ts).

import type {
  MapDocument,
  Spot,
  Review,
  ReviewComment,
  SpotPhoto,
  Zone,
  Route,
} from "./types";

export const DEMO_MAP_IDS = {
  groceries: "demo-cph-groceries",
  coffee: "demo-coffee",
  parks: "demo-parks",
  streetfood: "demo-streetfood",
} as const;

export const DEMO_DEFAULT_ACCENT = "#61C67A";
export const DEMO_DEFAULT_MARKER = "📍";
export const DEMO_DEFAULT_MARKER_COLOR = "#E8796F";

export const DEMO_MAPS: MapDocument[] = [
  {
    _id: DEMO_MAP_IDS.groceries,
    _createdAt: "2025-04-12T09:00:00.000Z",
    title: "Copenhagen Groceries",
    description:
      "The best supermarkets and discount shops across Copenhagen, rated by the people who shop there every day.",
    ownerName: "PeopleMaps Demo",
    ownerId: "1",
    isPublic: "public",
    baseCenter: { lat: 55.6761, lng: 12.5683 },
    baseZoom: 12,
    accentColor: "#61C67A",
    defaultMarker: "🛒",
    defaultMarkerColor: "#61C67A",
    welcomeMessage: "Help keep this list of the best groceries in town up to date.",
    submissionNote: "Add a shop you actually use — price level and a tip help a lot.",
    maxPhotosPerSpot: 6,
    requireApproval: false,
    allowReviews: true,
    allowComments: true,
    allowPhotos: true,
    collaborationMode: "anyone",
    enableClustering: false,
    category: "shopping",
    tags: "groceries, supermarkets, discount",
  },
  {
    _id: DEMO_MAP_IDS.coffee,
    _createdAt: "2025-05-02T09:00:00.000Z",
    title: "Best Coffee in Copenhagen",
    description:
      "Third-wave coffee spots, hidden cafes and roasteries worth an extra stop on your commute.",
    ownerName: "Anna K.",
    ownerId: "2",
    isPublic: "public",
    baseCenter: { lat: 55.6868, lng: 12.5591 },
    baseZoom: 13,
    accentColor: "#C99A5B",
    defaultMarker: "☕",
    defaultMarkerColor: "#C99A5B",
    welcomeMessage: "Flat whites, espresso bars and roasteries — add your favourite.",
    submissionNote: "Let people know whether there's seating and whether dogs are welcome.",
    maxPhotosPerSpot: 6,
    requireApproval: false,
    allowReviews: true,
    allowComments: true,
    allowPhotos: true,
    collaborationMode: "anyone",
    enableClustering: true,
    category: "food",
    tags: "coffee, cafes, roastery",
  },
  {
    _id: DEMO_MAP_IDS.parks,
    _createdAt: "2025-05-18T09:00:00.000Z",
    title: "Hidden Parks & Gardens",
    description:
      "Quiet green corners and pocket parks for a sunny lunch or a peaceful afternoon read.",
    ownerName: "Marcus L.",
    ownerId: "3",
    isPublic: "public",
    baseCenter: { lat: 55.6877, lng: 12.5767 },
    baseZoom: 13,
    accentColor: "#4BB0E8",
    defaultMarker: "🌳",
    defaultMarkerColor: "#4BB0E8",
    welcomeMessage: "Hidden gems where the lawn stays green and the noise stays out.",
    submissionNote: "Add parks that are easy to miss — courtyards and church gardens count.",
    maxPhotosPerSpot: 6,
    requireApproval: false,
    allowReviews: true,
    allowComments: true,
    allowPhotos: true,
    collaborationMode: "anyone",
    enableClustering: false,
    category: "outdoors",
    tags: "parks, gardens, quiet",
  },
  {
    _id: DEMO_MAP_IDS.streetfood,
    _createdAt: "2025-06-01T09:00:00.000Z",
    title: "Street Food Favorites",
    description:
      "The stalls and food markets locals actually queue for — plus what to order when you get there.",
    ownerName: "Sofia M.",
    ownerId: "4",
    isPublic: "public",
    baseCenter: { lat: 55.6682, lng: 12.5855 },
    baseZoom: 13,
    accentColor: "#F0AD00",
    defaultMarker: "🌭",
    defaultMarkerColor: "#F0AD00",
    welcomeMessage: "From open-air markets to night stalls — add the food worth standing in line for.",
    submissionNote: "Mention the must-order item in your tip.",
    maxPhotosPerSpot: 6,
    requireApproval: false,
    allowReviews: true,
    allowComments: true,
    allowPhotos: true,
    collaborationMode: "anyone",
    enableClustering: false,
    category: "food",
    tags: "streetfood, market, stalls",
  },
];

// ---- Seed content ----

interface DemoSpotSeed extends Omit<Spot, "mapId" | "createdAt"> {
  mapId: (typeof DEMO_MAP_IDS)[keyof typeof DEMO_MAP_IDS];
}

// Seed spots grouped by the map they belong to (the helper name is only for
// readability; mapId is carried on each seed below).
const groceriesSeeds: DemoSpotSeed[] = [
  // groceries
  { _id: "demo-spot-g1", name: "Rema 1000 Nørrebrogade", street: "Nørrebrogade 187", city: "Copenhagen", zip: 2200, lat: 55.6939, lng: 12.5461, priceLevel: 1, hoursNote: "Daily 08–22", tags: ["discount", "own-brand"], tip: "The cheap coffee beans are actually great.", status: "open", marker: "🛒", markerColor: "#61C67A", mapId: DEMO_MAP_IDS.groceries },
  { _id: "demo-spot-g2", name: "Torvehallerne", street: "Frederiksborggade 21", city: "Copenhagen", zip: 1360, lat: 55.6833, lng: 12.5728, priceLevel: 2, hoursNote: "Mon–Thu 10–19, Fri 10–20, Sat 9–18, Sun 9–17", tags: ["market", "speciality"], tip: "Go early on Saturday before the crowds.", status: "open", marker: "🥬", markerColor: "#4BB0E8", mapId: DEMO_MAP_IDS.groceries },
  { _id: "demo-spot-g3", name: "Netto Valby Langgade", street: "Valby Langgade 118", city: "Copenhagen", zip: 2500, lat: 55.672, lng: 12.5089, priceLevel: 1, hoursNote: "Daily 07–22", tags: ["discount"], tip: "Best fresh bread after 18:00.", status: "open", marker: "🛒", markerColor: "#61C67A", mapId: DEMO_MAP_IDS.groceries },
  { _id: "demo-spot-g4", name: "Irma Østerbro", street: "Østerbrogade 62", city: "Copenhagen", zip: 2100, lat: 55.7001, lng: 12.5863, priceLevel: 2, hoursNote: "Mon–Fri 08–21, Sat–Sun 09–20", tags: ["quality", "organic"], tip: "Great own-brand organic butter.", status: "open", marker: "🛒", markerColor: "#61C67A", mapId: DEMO_MAP_IDS.groceries },
  { _id: "demo-spot-g5", name: "Kødbyens Ostemarked", street: "Flæsketorvet 68", city: "Copenhagen", zip: 1711, lat: 55.6689, lng: 12.5588, priceLevel: 2, hoursNote: "Thu 16–20, Fri–Sat 11–17", tags: ["market", "cheese"], tip: "Taste before you buy — the aged gouda is superb.", status: "open", marker: "🧀", markerColor: "#F0AD00", mapId: DEMO_MAP_IDS.groceries },
];
const coffeeSeeds: DemoSpotSeed[] = [
  // coffee
  { _id: "demo-spot-c1", name: "Coffee Collective Godthåbsvej", street: "Godthåbsvej 34B", city: "Copenhagen", zip: 2000, lat: 55.6846, lng: 12.5341, priceLevel: 2, hoursNote: "Daily 08–18", tags: ["roastery", "espresso"], tip: "The Jaska natural taste is a must.", status: "open", marker: "☕", markerColor: "#C99A5B", mapId: DEMO_MAP_IDS.coffee },
  { _id: "demo-spot-c2", name: "Offside Coffee", street: "Ørnevej 37", city: "Copenhagen", zip: 2400, lat: 55.6915, lng: 12.5271, priceLevel: 1, hoursNote: "Mon–Fri 07–16, Sat 09–15", tags: ["filter", "small"], tip: "Tiny place, amazing filter roasts.", status: "open", marker: "☕", markerColor: "#C99A5B", mapId: DEMO_MAP_IDS.coffee },
  { _id: "demo-spot-c3", name: "Prolog Coffee Bar", street: "Guldbergsgade 20", city: "Copenhagen", zip: 2200, lat: 55.6942, lng: 12.5526, priceLevel: 2, hoursNote: "Daily 08–18", tags: ["espresso", "tasting"], tip: "Try the seasonal tasting pour-over.", status: "unknown", marker: "☕", markerColor: "#C99A5B", mapId: DEMO_MAP_IDS.coffee },
  { _id: "demo-spot-c4", name: "La Cabra Coffee Roasters", street: "Grønnegade 31", city: "Copenhagen", zip: 1107, lat: 55.6819, lng: 12.5841, priceLevel: 2, hoursNote: "Mon–Fri 08–17, Sat–Sun 09–17", tags: ["roastery", "pastries"], tip: "The cinnamon bun is as good as the coffee.", status: "open", marker: "☕", markerColor: "#C99A5B", mapId: DEMO_MAP_IDS.coffee },
];
const parksSeeds: DemoSpotSeed[] = [
  // parks
  { _id: "demo-spot-p1", name: "Assistens Kirkegård", street: "Kapelvej 4", city: "Copenhagen", zip: 2200, lat: 55.6923, lng: 12.5493, priceLevel: 0, hoursNote: "Always open", tags: ["graveyard", "cherry-blossom"], tip: "Spring blossom is unreal — bring a book.", status: "open", marker: "🌳", markerColor: "#4BB0E8", mapId: DEMO_MAP_IDS.parks },
  { _id: "demo-spot-p2", name: "King's Garden", street: "Gothersgade 128", city: "Copenhagen", zip: 1123, lat: 55.6848, lng: 12.5784, priceLevel: 0, hoursNote: "Daily 07–22", tags: ["castle", "roses"], tip: "Sunset from the south lawn.", status: "open", marker: "🌳", markerColor: "#4BB0E8", mapId: DEMO_MAP_IDS.parks },
  { _id: "demo-spot-p3", name: "St. Hans Plads", street: "St. Hans Torv", city: "Copenhagen", zip: 2200, lat: 55.6931, lng: 12.5507, priceLevel: 0, hoursNote: "Always open", tags: ["square", "picnic"], tip: "Popular for after-work picnics — grab the bench by the fountain.", status: "open", marker: "🌳", markerColor: "#4BB0E8", mapId: DEMO_MAP_IDS.parks },
];
const streetfoodSeeds: DemoSpotSeed[] = [
  { _id: "demo-spot-s1", name: "Refshalevej Food Market", street: "Refshalevej 167F", city: "Copenhagen", zip: 1432, lat: 55.6903, lng: 12.6069, priceLevel: 2, hoursNote: "Fri–Sun 12–21", tags: ["market", "pizza"], tip: "The wood-fired pizza from Soulbirds.", status: "open", marker: "🌭", markerColor: "#F0AD00", mapId: DEMO_MAP_IDS.streetfood },
  { _id: "demo-spot-s2", name: "Kødbyens Hal 7", street: "Høkerboderne 19", city: "Copenhagen", zip: 1712, lat: 55.6686, lng: 12.5592, priceLevel: 2, hoursNote: "Daily 08–00", tags: ["market", "burgers"], tip: "Hija de Sánchez tacos on weekends.", status: "open", marker: "🌭", markerColor: "#F0AD00", mapId: DEMO_MAP_IDS.streetfood },
  { _id: "demo-spot-s3", name: "Døp", street: "Gråbrødretorv 8", city: "Copenhagen", zip: 1154, lat: 55.6806, lng: 12.5751, priceLevel: 1, hoursNote: "Daily 11–21", tags: ["hotdogs", "organic"], tip: "Get the bacon wrap, skip the sauce.", status: "open", marker: "🌭", markerColor: "#F0AD00", mapId: DEMO_MAP_IDS.streetfood },
];

export const DEMO_SPOTS: Spot[] = [
  ...groceriesSeeds,
  ...coffeeSeeds,
  ...parksSeeds,
  ...streetfoodSeeds,
].map((s, idx) => ({
  ...s,
  createdBy: String((idx % 4) + 1),
  createdAt: new Date(Date.UTC(2025, 3 + (idx % 12), 5 + idx, 10, 0, 0)).toISOString(),
  moderation: "approved" as const,
  hidden: false,
}));

export const DEMO_REVIEWS: Review[] = [
  { _id: "demo-review-1", spotId: "demo-spot-g1", review: "Best discount chain in the area. Always clean and the staff remember you.", score: 5, date: "2025-06-01", user_fk: "1" },
  { _id: "demo-review-2", spotId: "demo-spot-g1", review: "Parking is a pain but prices are unbeatable.", score: 4, date: "2025-07-12", user_fk: "2" },
  { _id: "demo-review-3", spotId: "demo-spot-g2", review: "Beautiful hall, great for gifts, but touristy prices.", score: 3, date: "2025-06-20", user_fk: "3" },
  { _id: "demo-review-4", spotId: "demo-spot-c1", review: "The best cortado in Copenhagen, hands down.", score: 5, date: "2025-05-30", user_fk: "1" },
  { _id: "demo-review-5", spotId: "demo-spot-c1", review: "Queue at 10am on Sundays — worth the wait.", score: 4, date: "2025-07-02", user_fk: "4" },
  { _id: "demo-review-6", spotId: "demo-spot-c3", review: "Seasonal roasts change often, always interesting.", score: 4, date: "2025-06-15", user_fk: "2" },
  { _id: "demo-review-7", spotId: "demo-spot-p1", review: "Peaceful even mid-day. Cherry blossoms are magical.", score: 5, date: "2025-05-10", user_fk: "3" },
  { _id: "demo-review-8", spotId: "demo-spot-p2", review: "Lovely roses, but busier than you'd hope.", score: 4, date: "2025-07-21", user_fk: "1" },
  { _id: "demo-review-9", spotId: "demo-spot-s1", review: "Soulbirds pizza alone is worth the trip across the harbour.", score: 5, date: "2025-06-28", user_fk: "2" },
  { _id: "demo-review-10", spotId: "demo-spot-s2", review: "Huge hall, tons of choice, seats go fast.", score: 4, date: "2025-07-05", user_fk: "4" },
];

export const DEMO_COMMENTS: ReviewComment[] = [
  { _id: "demo-comment-1", reviewId: "demo-review-4", parentId: null, user_fk: "2", date: "2025-06-01", text: "Try their beans at home too — the bag lasts forever." },
  { _id: "demo-comment-2", reviewId: "demo-review-4", parentId: "demo-comment-1", user_fk: "1", date: "2025-06-02", text: "Good tip, thanks!" },
  { _id: "demo-comment-3", reviewId: "demo-review-9", parentId: null, user_fk: "3", date: "2025-06-29", text: "Second that — the Diavola is great." },
];

function svgPhoto(fill: string, label: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">` +
    `<rect width="640" height="400" rx="8" fill="${fill}"/>` +
    `<text x="320" y="205" font-family="system-ui, sans-serif" font-size="32" fill="#ffffff" ` +
    `text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const DEMO_PHOTOS: SpotPhoto[] = [
  { _id: "demo-photo-1", spotId: "demo-spot-g1", date: "2025-06-01", uploader_fk: "1", dataUrl: svgPhoto("#61C67A", "Aisles & specials") },
  { _id: "demo-photo-2", spotId: "demo-spot-c1", date: "2025-05-30", uploader_fk: "1", dataUrl: svgPhoto("#C99A5B", "Fresh pull") },
  { _id: "demo-photo-3", spotId: "demo-spot-p1", date: "2025-05-10", uploader_fk: "3", dataUrl: svgPhoto("#4BB0E8", "Cherry blossom walk") },
  { _id: "demo-photo-4", spotId: "demo-spot-s1", date: "2025-06-28", uploader_fk: "2", dataUrl: svgPhoto("#F0AD00", "Harbour pizzas") },
];

export const DEMO_ZONES: Zone[] = [
  {
    _id: "demo-zone-1",
    mapId: DEMO_MAP_IDS.groceries,
    name: "Nørrebro discount strip",
    shape: "circle",
    center: [55.6939, 12.5461],
    radius: 600,
    color: "#61C67A",
    description: "The densest cluster of cheap supermarkets in the area.",
    createdBy: "1",
    createdAt: "2025-06-10T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
  {
    _id: "demo-zone-2",
    mapId: DEMO_MAP_IDS.parks,
    name: "Inner-city green belt",
    shape: "polygon",
    points: [
      [55.6905, 12.5452],
      [55.6962, 12.5596],
      [55.6899, 12.5652],
      [55.6857, 12.5552],
    ],
    color: "#4BB0E8",
    description: "Best connected green spaces for a longer walk.",
    createdBy: "3",
    createdAt: "2025-06-15T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
];

export const DEMO_ROUTES: Route[] = [
  {
    _id: "demo-route-1",
    mapId: DEMO_MAP_IDS.coffee,
    name: "The roastery crawl",
    points: [
      [55.6846, 12.5341],
      [55.6915, 12.5271],
      [55.6942, 12.5526],
      [55.6819, 12.5841],
    ],
    color: "#C99A5B",
    description: "Four roasteries in one afternoon — starts at Godsbanen.",
    createdBy: "2",
    createdAt: "2025-06-20T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
];
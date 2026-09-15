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
  streetart: "demo-street-art",
  water: "demo-water",
  latenight: "demo-late-night",
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
    choroplethRamp: "sequential",
    choroplethMetric: "priceLevel",
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
  // No-account maps: owned by no one, maintained by the community. `ownerId` /
  // `ownerName` are intentionally omitted so the maps are not tied to any user.
  {
    _id: DEMO_MAP_IDS.streetart,
    _createdAt: "2025-06-15T09:00:00.000Z",
    title: "Copenhagen Graffiti & Street Art",
    description:
      "Murals, paste-ups and pieces worth a detour — the city's open-air gallery changes constantly, so check back often.",
    isPublic: "public",
    baseCenter: { lat: 55.685, lng: 12.5495 },
    baseZoom: 13,
    accentColor: "#9B6BF0",
    defaultMarker: "🎨",
    defaultMarkerColor: "#9B6BF0",
    welcomeMessage: "Spot something new? Add it — artist credits are a bonus.",
    submissionNote: "Mention the artist or collective if you know it.",
    maxPhotosPerSpot: 6,
    requireApproval: false,
    allowReviews: true,
    allowComments: true,
    allowPhotos: true,
    collaborationMode: "anyone",
    enableClustering: true,
    choroplethRamp: "sequential",
    choroplethMetric: "rating",
    category: "arts",
    tags: "streetart, graffiti, murals",
  },
  {
    _id: DEMO_MAP_IDS.water,
    _createdAt: "2025-06-22T09:00:00.000Z",
    title: "Copenhagen Public Water Fountains",
    description:
      "Free, safe drinking fountains for refills — mapped by the community so your bottle never runs dry.",
    isPublic: "public",
    baseCenter: { lat: 55.68, lng: 12.567 },
    baseZoom: 13,
    accentColor: "#3BB0A0",
    defaultMarker: "🚰",
    defaultMarkerColor: "#3BB0A0",
    welcomeMessage: "Keep the taps flowing — add fountains you've drunk from.",
    submissionNote: "Roughly right is fine; note unusual taste or trickles in the tip.",
    maxPhotosPerSpot: 6,
    requireApproval: false,
    allowReviews: true,
    allowComments: true,
    allowPhotos: true,
    collaborationMode: "anyone",
    enableClustering: false,
    choroplethRamp: "diverging",
    choroplethMetric: "rating",
    category: "outdoors",
    tags: "water, fountains, refill",
  },
  {
    _id: DEMO_MAP_IDS.latenight,
    _createdAt: "2025-07-03T09:00:00.000Z",
    title: "Late Night Eats",
    description:
      "Open past midnight — falafel, pizza and more for the after-hours crowd across Copenhagen.",
    isPublic: "public",
    baseCenter: { lat: 55.6695, lng: 12.5592 },
    baseZoom: 13,
    accentColor: "#FF8A3D",
    defaultMarker: "🌙",
    defaultMarkerColor: "#FF8A3D",
    welcomeMessage: "The late kitchen finds that keep the city going after midnight.",
    submissionNote: "Add real closing times — 'close enough' isn't a time.",
    maxPhotosPerSpot: 6,
    requireApproval: false,
    allowReviews: true,
    allowComments: true,
    allowPhotos: true,
    collaborationMode: "anyone",
    enableClustering: false,
    choroplethRamp: "sequential",
    choroplethMetric: "priceLevel",
    category: "food",
    tags: "late-night, kebab, pizza, open-late",
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
// No-account spots: submitted by no one, so `createdBy` is explicitly null and
// reviewers/photo uploaders render as "Anonymous" (see MapsHomePage).
const communitySeeds: DemoSpotSeed[] = [
  // street art
  { _id: "demo-spot-a1", name: "Superkilen Public Art", street: "Nørrebrogade 220", city: "Copenhagen", zip: 2200, lat: 55.6934, lng: 12.5495, priceLevel: 0, hoursNote: "Always open", tags: ["public-art", "square"], tip: "The red square has giant objects from 50+ countries.", status: "open", marker: "🎨", markerColor: "#9B6BF0", createdBy: null, mapId: DEMO_MAP_IDS.streetart },
  { _id: "demo-spot-a2", name: "Sorte Firkant Mural", street: "Gammel Køge Landevej 17", city: "Copenhagen", zip: 2500, lat: 55.6685, lng: 12.5397, priceLevel: 0, hoursNote: "Always open", tags: ["mural", "railway"], tip: "Painted along the abandoned rail corridor — best at golden hour.", status: "open", marker: "🎨", markerColor: "#9B6BF0", createdBy: null, mapId: DEMO_MAP_IDS.streetart },
  { _id: "demo-spot-a3", name: "Værnedamsvej Paste-ups", street: "Værnedamsvej 3", city: "Copenhagen", zip: 1619, lat: 55.6723, lng: 12.5597, priceLevel: 0, hoursNote: "Always open", tags: ["paste-up", "facade"], tip: "Façades rotate every few months — new artists each season.", status: "open", marker: "🎨", markerColor: "#9B6BF0", createdBy: null, mapId: DEMO_MAP_IDS.streetart },
  // water
  { _id: "demo-spot-w1", name: "Islands Brygge Harbourside Fountain", street: "Islands Brygge 6", city: "Copenhagen", zip: 2300, lat: 55.6518, lng: 12.5788, priceLevel: 0, hoursNote: "Always open", tags: ["harbour", "refill"], tip: "Pair it with a dip in the harbour bath.", status: "open", marker: "🚰", markerColor: "#3BB0A0", createdBy: null, mapId: DEMO_MAP_IDS.water },
  { _id: "demo-spot-w2", name: "King's Garden Fountain", street: "Gothersgade 128", city: "Copenhagen", zip: 1123, lat: 55.6852, lng: 12.5777, priceLevel: 0, hoursNote: "Daily 07–22", tags: ["park", "roses"], tip: "Central water source beside the rose beds.", status: "open", marker: "🚰", markerColor: "#3BB0A0", createdBy: null, mapId: DEMO_MAP_IDS.water },
  { _id: "demo-spot-w3", name: "Nørrebroparken Drinking Fountain", street: "Nørrebrogade 210", city: "Copenhagen", zip: 2200, lat: 55.6999, lng: 12.5589, priceLevel: 0, hoursNote: "Always open", tags: ["park", "jogging"], tip: "A quick stop on the morning run loop.", status: "open", marker: "🚰", markerColor: "#3BB0A0", createdBy: null, mapId: DEMO_MAP_IDS.water },
  // late night
  { _id: "demo-spot-l1", name: "Midnight Falafel", street: "Istedgade 42", city: "Copenhagen", zip: 1650, lat: 55.6681, lng: 12.5504, priceLevel: 1, hoursNote: "Fri–Sat to 03:00", tags: ["falafel", "open-late"], tip: "Falafel pita with extra pickles, every time.", status: "open", marker: "🌙", markerColor: "#FF8A3D", createdBy: null, mapId: DEMO_MAP_IDS.latenight },
  { _id: "demo-spot-l2", name: "The 24/7 Kiosk", street: "Nørrebrogade 86", city: "Copenhagen", zip: 2200, lat: 55.689, lng: 12.5485, priceLevel: 1, hoursNote: "Open 24 hours", tags: ["kiosk", "snacks"], tip: "Cold drinks and warm sausage rolls at 4am.", status: "open", marker: "🌙", markerColor: "#FF8A3D", createdBy: null, mapId: DEMO_MAP_IDS.latenight },
  { _id: "demo-spot-l3", name: "Late Slice Pizzeria", street: "Amagerbrogade 19", city: "Copenhagen", zip: 2300, lat: 55.6639, lng: 12.602, priceLevel: 2, hoursNote: "Daily to 02:00", tags: ["pizza", "open-late"], tip: "Ask for the pepperoni by-the-slice window.", status: "open", marker: "🌙", markerColor: "#FF8A3D", createdBy: null, mapId: DEMO_MAP_IDS.latenight },
];

export const DEMO_SPOTS: Spot[] = [
  ...groceriesSeeds,
  ...coffeeSeeds,
  ...parksSeeds,
  ...streetfoodSeeds,
  ...communitySeeds,
].map((s, idx) => ({
  ...s,
  createdBy: s.createdBy ?? String((idx % 4) + 1),
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
  // No-account map reviews (anonymous authors)
  { _id: "demo-review-11", spotId: "demo-spot-a1", review: "The whole Superkilen stretch is an art gallery you can walk through.", score: 5, date: "2025-07-15", user_fk: null },
  { _id: "demo-review-12", spotId: "demo-spot-a2", review: "Sorte Firkant changes constantly — always something new to spot.", score: 4, date: "2025-08-03", user_fk: null },
  { _id: "demo-review-13", spotId: "demo-spot-a3", review: "Small but beautiful paste-ups; the rotation keeps it fresh.", score: 4, date: "2025-08-12", user_fk: null },
  { _id: "demo-review-14", spotId: "demo-spot-w1", review: "Cold, clean, and right by the harbour bath. Perfect.", score: 5, date: "2025-07-22", user_fk: null },
  { _id: "demo-review-15", spotId: "demo-spot-w3", review: "Reliable pressure — good enough for a mid-run refill.", score: 4, date: "2025-08-01", user_fk: null },
  { _id: "demo-review-16", spotId: "demo-spot-l1", review: "Best late falafel in town, hands down.", score: 5, date: "2025-07-29", user_fk: null },
  { _id: "demo-review-17", spotId: "demo-spot-l3", review: "Saved us after the late train home.", score: 4, date: "2025-08-10", user_fk: null },
];

export const DEMO_COMMENTS: ReviewComment[] = [
  { _id: "demo-comment-1", reviewId: "demo-review-4", parentId: null, user_fk: "2", date: "2025-06-01", text: "Try their beans at home too — the bag lasts forever." },
  { _id: "demo-comment-2", reviewId: "demo-review-4", parentId: "demo-comment-1", user_fk: "1", date: "2025-06-02", text: "Good tip, thanks!" },
  { _id: "demo-comment-3", reviewId: "demo-review-9", parentId: null, user_fk: "3", date: "2025-06-29", text: "Second that — the Diavola is great." },
  { _id: "demo-comment-4", reviewId: "demo-review-11", parentId: null, user_fk: null, date: "2025-07-16", text: "Bonus tip — the basketball court next to Superkilen is lit at night." },
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
  // No-account map photos (anonymous uploaders)
  { _id: "demo-photo-5", spotId: "demo-spot-a1", date: "2025-07-15", uploader_fk: null, dataUrl: svgPhoto("#9B6BF0", "Superkilen columns") },
  { _id: "demo-photo-6", spotId: "demo-spot-w1", date: "2025-07-22", uploader_fk: null, dataUrl: svgPhoto("#3BB0A0", "Harbour refill") },
  { _id: "demo-photo-7", spotId: "demo-spot-l1", date: "2025-07-29", uploader_fk: null, dataUrl: svgPhoto("#FF8A3D", "Falafel till late") },
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
    // Choropleth demo: average price level (1 = cheap, 3 = expensive) plus a
    // trust count + freshness so the legend/footnote has something to show.
    value: 1.4,
    valueCount: 12,
    valueUpdatedAt: "2025-06-10T09:00:00.000Z",
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
    value: 2.6,
    valueCount: 23,
    valueUpdatedAt: "2025-07-01T09:00:00.000Z",
    description: "Best connected green spaces for a longer walk.",
    createdBy: "3",
    createdAt: "2025-06-15T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
  // No-account map zones
  {
    _id: "demo-zone-3",
    mapId: DEMO_MAP_IDS.streetart,
    name: "Nørrebro art corridor",
    shape: "polygon",
    points: [
      [55.6981, 12.5449],
      [55.6926, 12.5612],
      [55.689, 12.5512],
      [55.6934, 12.5449],
    ],
    color: "#9B6BF0",
    value: 4.3,
    valueCount: 11,
    valueUpdatedAt: "2025-08-01T09:00:00.000Z",
    description: "The densest stretch of murals and paste-ups in the city.",
    createdBy: null,
    createdAt: "2025-07-10T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
  {
    _id: "demo-zone-4",
    mapId: DEMO_MAP_IDS.water,
    name: "Inner-city refill ring",
    shape: "circle",
    center: [55.6789, 12.5734],
    radius: 900,
    color: "#3BB0A0",
    value: 4.6,
    valueCount: 27,
    valueUpdatedAt: "2025-07-20T09:00:00.000Z",
    description: "Most of the inner-city fountains sit inside this ring.",
    createdBy: null,
    createdAt: "2025-07-01T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
  {
    _id: "demo-zone-5",
    mapId: DEMO_MAP_IDS.latenight,
    name: "Vesterbro after dark",
    shape: "circle",
    center: [55.6681, 12.5504],
    radius: 800,
    color: "#FF8A3D",
    value: 1.6,
    valueCount: 18,
    valueUpdatedAt: "2025-07-25T09:00:00.000Z",
    description: "The densest late-night kitchen cluster in the city.",
    createdBy: null,
    createdAt: "2025-07-12T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
];

// Choropleth data range for the demo overlay (min/max across valued zones).
export const DEMO_CHOROPLETH_MIN = 1;
export const DEMO_CHOROPLETH_MAX = 3;

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
  {
    _id: "demo-route-2",
    mapId: DEMO_MAP_IDS.streetart,
    name: "Street art loop",
    points: [
      [55.6934, 12.5495],
      [55.6852, 12.5777],
      [55.6723, 12.5597],
      [55.6685, 12.5397],
    ],
    color: "#9B6BF0",
    description: "Three neighbourhoods of outdoor art in one afternoon walk.",
    createdBy: null,
    createdAt: "2025-07-15T09:00:00.000Z",
    moderation: "approved",
    hidden: false,
  },
];
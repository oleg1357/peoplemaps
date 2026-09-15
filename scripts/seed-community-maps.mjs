// One-off seed: ownerless (community) maps for the LIVE backend — the full demo
// dataset (groceries, coffee, parks, street food + street art, water, late
// night) so the site has content for everyone, with no account attached.
// - Map documents go to Sanity (via SANITY_API_WRITE_TOKEN), no ownerId/ownerName.
// - Spots/zones/routes/reviews/comments/photos go to MongoDB under each map's _id.
// Idempotent: maps that already have spots are skipped on re-run.
// Run from repo root: node scripts/seed-community-maps.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@sanity/client";
import { MongoClient } from "mongodb";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- .env.local loader (no dotenv dependency) ----
const env = {};
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const need = (k) => {
  if (!env[k]) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
  return env[k];
};

const projectId = need("NEXT_PUBLIC_SANITY_PROJECT_ID");
const dataset = need("NEXT_PUBLIC_SANITY_DATASET");
const writeToken = need("SANITY_API_WRITE_TOKEN");
const uri = need("MONGODB_URI");
const dbName = env["MONGODB_DB"] || "peoplemaps";

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: "2026-02-01",
  useCdn: false,
  token: writeToken,
});

const maps = [
  {
    slug: "copenhagen-groceries",
    doc: {
      _type: "map",
      title: "Copenhagen Groceries",
      slug: { _type: "slug", current: "copenhagen-groceries" },
      description:
        "The best supermarkets and discount shops across Copenhagen, rated by the people who shop there every day.",
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
    spots: [
      { name: "Rema 1000 Nørrebrogade", street: "Nørrebrogade 187", city: "Copenhagen", zip: 2200, lat: 55.6939, lng: 12.5461, priceLevel: 1, hoursNote: "Daily 08–22", tags: ["discount", "own-brand"], tip: "The cheap coffee beans are actually great.", status: "open", marker: "🛒", markerColor: "#61C67A" },
      { name: "Torvehallerne", street: "Frederiksborggade 21", city: "Copenhagen", zip: 1360, lat: 55.6833, lng: 12.5728, priceLevel: 2, hoursNote: "Mon–Thu 10–19, Fri 10–20, Sat 9–18, Sun 9–17", tags: ["market", "speciality"], tip: "Go early on Saturday before the crowds.", status: "open", marker: "🥬", markerColor: "#4BB0E8" },
      { name: "Netto Valby Langgade", street: "Valby Langgade 118", city: "Copenhagen", zip: 2500, lat: 55.672, lng: 12.5089, priceLevel: 1, hoursNote: "Daily 07–22", tags: ["discount"], tip: "Best fresh bread after 18:00.", status: "open", marker: "🛒", markerColor: "#61C67A" },
      { name: "Irma Østerbro", street: "Østerbrogade 62", city: "Copenhagen", zip: 2100, lat: 55.7001, lng: 12.5863, priceLevel: 2, hoursNote: "Mon–Fri 08–21, Sat–Sun 09–20", tags: ["quality", "organic"], tip: "Great own-brand organic butter.", status: "open", marker: "🛒", markerColor: "#61C67A" },
      { name: "Kødbyens Ostemarked", street: "Flæsketorvet 68", city: "Copenhagen", zip: 1711, lat: 55.6689, lng: 12.5588, priceLevel: 2, hoursNote: "Thu 16–20, Fri–Sat 11–17", tags: ["market", "cheese"], tip: "Taste before you buy — the aged gouda is superb.", status: "open", marker: "🧀", markerColor: "#F0AD00" },
    ],
    zones: [
      {
        name: "Nørrebro discount strip",
        shape: "circle",
        center: [55.6939, 12.5461],
        radius: 600,
        color: "#61C67A",
        value: 1.4,
        valueCount: 12,
        valueUpdatedAt: "2025-06-10T09:00:00.000Z",
        description: "The densest cluster of cheap supermarkets in the area.",
        createdAt: "2025-06-10T09:00:00.000Z",
      },
    ],
    routes: [],
    reviews: [
      { spot: 0, score: 5, date: "2025-06-01", text: "Best discount chain in the area. Always clean and the staff remember you." },
      { spot: 0, score: 4, date: "2025-07-12", text: "Parking is a pain but prices are unbeatable." },
      { spot: 1, score: 3, date: "2025-06-20", text: "Beautiful hall, great for gifts, but touristy prices." },
    ],
    comments: [],
    photo: { spot: 0, date: "2025-06-01", color: "#61C67A", label: "Aisles & specials" },
  },
  {
    slug: "best-coffee-in-copenhagen",
    doc: {
      _type: "map",
      title: "Best Coffee in Copenhagen",
      slug: { _type: "slug", current: "best-coffee-in-copenhagen" },
      description:
        "Third-wave coffee spots, hidden cafes and roasteries worth an extra stop on your commute.",
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
      choroplethRamp: "sequential",
      choroplethMetric: "rating",
      category: "food",
      tags: "coffee, cafes, roastery",
    },
    spots: [
      { name: "Coffee Collective Godthåbsvej", street: "Godthåbsvej 34B", city: "Copenhagen", zip: 2000, lat: 55.6846, lng: 12.5341, priceLevel: 2, hoursNote: "Daily 08–18", tags: ["roastery", "espresso"], tip: "The Jaska natural taste is a must.", status: "open", marker: "☕", markerColor: "#C99A5B" },
      { name: "Offside Coffee", street: "Ørnevej 37", city: "Copenhagen", zip: 2400, lat: 55.6915, lng: 12.5271, priceLevel: 1, hoursNote: "Mon–Fri 07–16, Sat 09–15", tags: ["filter", "small"], tip: "Tiny place, amazing filter roasts.", status: "open", marker: "☕", markerColor: "#C99A5B" },
      { name: "Prolog Coffee Bar", street: "Guldbergsgade 20", city: "Copenhagen", zip: 2200, lat: 55.6942, lng: 12.5526, priceLevel: 2, hoursNote: "Daily 08–18", tags: ["espresso", "tasting"], tip: "Try the seasonal tasting pour-over.", status: "unknown", marker: "☕", markerColor: "#C99A5B" },
      { name: "La Cabra Coffee Roasters", street: "Grønnegade 31", city: "Copenhagen", zip: 1107, lat: 55.6819, lng: 12.5841, priceLevel: 2, hoursNote: "Mon–Fri 08–17, Sat–Sun 09–17", tags: ["roastery", "pastries"], tip: "The cinnamon bun is as good as the coffee.", status: "open", marker: "☕", markerColor: "#C99A5B" },
    ],
    zones: [],
    routes: [
      {
        name: "The roastery crawl",
        points: [[55.6846, 12.5341], [55.6915, 12.5271], [55.6942, 12.5526], [55.6819, 12.5841]],
        color: "#C99A5B",
        description: "Four roasteries in one afternoon — starts at Godsbanen.",
        createdAt: "2025-06-20T09:00:00.000Z",
      },
    ],
    reviews: [
      { spot: 0, score: 5, date: "2025-05-30", text: "The best cortado in Copenhagen, hands down." },
      { spot: 0, score: 4, date: "2025-07-02", text: "Queue at 10am on Sundays — worth the wait." },
      { spot: 2, score: 4, date: "2025-06-15", text: "Seasonal roasts change often, always interesting." },
    ],
    comments: [
      { review: 0, parent: null, date: "2025-06-01", text: "Try their beans at home too — the bag lasts forever." },
      { review: 0, parent: 0, date: "2025-06-02", text: "Good tip, thanks!" },
    ],
    photo: { spot: 0, date: "2025-05-30", color: "#C99A5B", label: "Fresh pull" },
  },
  {
    slug: "hidden-parks-gardens",
    doc: {
      _type: "map",
      title: "Hidden Parks & Gardens",
      slug: { _type: "slug", current: "hidden-parks-gardens" },
      description:
        "Quiet green corners and pocket parks for a sunny lunch or a peaceful afternoon read.",
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
      choroplethRamp: "sequential",
      choroplethMetric: "rating",
      category: "outdoors",
      tags: "parks, gardens, quiet",
    },
    spots: [
      { name: "Assistens Kirkegård", street: "Kapelvej 4", city: "Copenhagen", zip: 2200, lat: 55.6923, lng: 12.5493, priceLevel: 0, hoursNote: "Always open", tags: ["graveyard", "cherry-blossom"], tip: "Spring blossom is unreal — bring a book.", status: "open", marker: "🌳", markerColor: "#4BB0E8" },
      { name: "King's Garden", street: "Gothersgade 128", city: "Copenhagen", zip: 1123, lat: 55.6848, lng: 12.5784, priceLevel: 0, hoursNote: "Daily 07–22", tags: ["castle", "roses"], tip: "Sunset from the south lawn.", status: "open", marker: "🌳", markerColor: "#4BB0E8" },
      { name: "St. Hans Plads", street: "St. Hans Torv", city: "Copenhagen", zip: 2200, lat: 55.6931, lng: 12.5507, priceLevel: 0, hoursNote: "Always open", tags: ["square", "picnic"], tip: "Popular for after-work picnics — grab the bench by the fountain.", status: "open", marker: "🌳", markerColor: "#4BB0E8" },
    ],
    zones: [
      {
        name: "Inner-city green belt",
        shape: "polygon",
        points: [[55.6905, 12.5452], [55.6962, 12.5596], [55.6899, 12.5652], [55.6857, 12.5552]],
        color: "#4BB0E8",
        value: 2.6,
        valueCount: 23,
        valueUpdatedAt: "2025-07-01T09:00:00.000Z",
        description: "Best connected green spaces for a longer walk.",
        createdAt: "2025-06-15T09:00:00.000Z",
      },
    ],
    routes: [],
    reviews: [
      { spot: 0, score: 5, date: "2025-05-10", text: "Peaceful even mid-day. Cherry blossoms are magical." },
      { spot: 1, score: 4, date: "2025-07-21", text: "Lovely roses, but busier than you'd hope." },
    ],
    comments: [],
    photo: { spot: 0, date: "2025-05-10", color: "#4BB0E8", label: "Cherry blossom walk" },
  },
  {
    slug: "street-food-favorites",
    doc: {
      _type: "map",
      title: "Street Food Favorites",
      slug: { _type: "slug", current: "street-food-favorites" },
      description:
        "The stalls and food markets locals actually queue for — plus what to order when you get there.",
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
      choroplethRamp: "sequential",
      choroplethMetric: "priceLevel",
      category: "food",
      tags: "streetfood, market, stalls",
    },
    spots: [
      { name: "Refshalevej Food Market", street: "Refshalevej 167F", city: "Copenhagen", zip: 1432, lat: 55.6903, lng: 12.6069, priceLevel: 2, hoursNote: "Fri–Sun 12–21", tags: ["market", "pizza"], tip: "The wood-fired pizza from Soulbirds.", status: "open", marker: "🌭", markerColor: "#F0AD00" },
      { name: "Kødbyens Hal 7", street: "Høkerboderne 19", city: "Copenhagen", zip: 1712, lat: 55.6686, lng: 12.5592, priceLevel: 2, hoursNote: "Daily 08–00", tags: ["market", "burgers"], tip: "Hija de Sánchez tacos on weekends.", status: "open", marker: "🌭", markerColor: "#F0AD00" },
      { name: "Døp", street: "Gråbrødretorv 8", city: "Copenhagen", zip: 1154, lat: 55.6806, lng: 12.5751, priceLevel: 1, hoursNote: "Daily 11–21", tags: ["hotdogs", "organic"], tip: "Get the bacon wrap, skip the sauce.", status: "open", marker: "🌭", markerColor: "#F0AD00" },
    ],
    zones: [],
    routes: [],
    reviews: [
      { spot: 0, score: 5, date: "2025-06-28", text: "Soulbirds pizza alone is worth the trip across the harbour." },
      { spot: 1, score: 4, date: "2025-07-05", text: "Huge hall, tons of choice, seats go fast." },
    ],
    comments: [
      { review: 0, parent: null, date: "2025-06-29", text: "Second that — the Diavola is great." },
    ],
    photo: { spot: 0, date: "2025-06-28", color: "#F0AD00", label: "Harbour pizzas" },
  },
  {
    slug: "copenhagen-graffiti-street-art",
    doc: {
      _type: "map",
      title: "Copenhagen Graffiti & Street Art",
      slug: { _type: "slug", current: "copenhagen-graffiti-street-art" },
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
    spots: [
      { name: "Superkilen Public Art", street: "Nørrebrogade 220", city: "Copenhagen", zip: 2200, lat: 55.6934, lng: 12.5495, priceLevel: 0, hoursNote: "Always open", tags: ["public-art", "square"], tip: "The red square has giant objects from 50+ countries.", status: "open", marker: "🎨", markerColor: "#9B6BF0" },
      { name: "Sorte Firkant Mural", street: "Gammel Køge Landevej 17", city: "Copenhagen", zip: 2500, lat: 55.6685, lng: 12.5397, priceLevel: 0, hoursNote: "Always open", tags: ["mural", "railway"], tip: "Painted along the abandoned rail corridor — best at golden hour.", status: "open", marker: "🎨", markerColor: "#9B6BF0" },
      { name: "Værnedamsvej Paste-ups", street: "Værnedamsvej 3", city: "Copenhagen", zip: 1619, lat: 55.6723, lng: 12.5597, priceLevel: 0, hoursNote: "Always open", tags: ["paste-up", "facade"], tip: "Façades rotate every few months — new artists each season.", status: "open", marker: "🎨", markerColor: "#9B6BF0" },
    ],
    zones: [
      {
        name: "Nørrebro art corridor",
        shape: "polygon",
        points: [[55.6981, 12.5449], [55.6926, 12.5612], [55.689, 12.5512], [55.6934, 12.5449]],
        color: "#9B6BF0",
        value: 4.3,
        valueCount: 11,
        valueUpdatedAt: "2025-08-01T09:00:00.000Z",
        description: "The densest stretch of murals and paste-ups in the city.",
        createdAt: "2025-07-10T09:00:00.000Z",
      },
    ],
    routes: [
      {
        name: "Street art loop",
        points: [[55.6934, 12.5495], [55.6852, 12.5777], [55.6723, 12.5597], [55.6685, 12.5397]],
        color: "#9B6BF0",
        description: "Three neighbourhoods of outdoor art in one afternoon walk.",
        createdAt: "2025-07-15T09:00:00.000Z",
      },
    ],
    reviews: [
      { spot: 0, score: 5, date: "2025-07-15", text: "The whole Superkilen stretch is an art gallery you can walk through." },
      { spot: 1, score: 4, date: "2025-08-03", text: "Sorte Firkant changes constantly — always something new to spot." },
      { spot: 2, score: 4, date: "2025-08-12", text: "Small but beautiful paste-ups; the rotation keeps it fresh." },
    ],
    comments: [
      { review: 0, parent: null, date: "2025-07-16", text: "Bonus tip — the basketball court next to Superkilen is lit at night." },
    ],
    photo: { spot: 0, date: "2025-07-15", color: "#9B6BF0", label: "Superkilen columns" },
  },
  {
    slug: "copenhagen-public-water-fountains",
    doc: {
      _type: "map",
      title: "Copenhagen Public Water Fountains",
      slug: { _type: "slug", current: "copenhagen-public-water-fountains" },
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
    spots: [
      { name: "Islands Brygge Harbourside Fountain", street: "Islands Brygge 6", city: "Copenhagen", zip: 2300, lat: 55.6518, lng: 12.5788, priceLevel: 0, hoursNote: "Always open", tags: ["harbour", "refill"], tip: "Pair it with a dip in the harbour bath.", status: "open", marker: "🚰", markerColor: "#3BB0A0" },
      { name: "King's Garden Fountain", street: "Gothersgade 128", city: "Copenhagen", zip: 1123, lat: 55.6852, lng: 12.5777, priceLevel: 0, hoursNote: "Daily 07–22", tags: ["park", "roses"], tip: "Central water source beside the rose beds.", status: "open", marker: "🚰", markerColor: "#3BB0A0" },
      { name: "Nørrebroparken Drinking Fountain", street: "Nørrebrogade 210", city: "Copenhagen", zip: 2200, lat: 55.6999, lng: 12.5589, priceLevel: 0, hoursNote: "Always open", tags: ["park", "jogging"], tip: "A quick stop on the morning run loop.", status: "open", marker: "🚰", markerColor: "#3BB0A0" },
    ],
    zones: [
      {
        name: "Inner-city refill ring",
        shape: "circle",
        center: [55.6789, 12.5734],
        radius: 900,
        color: "#3BB0A0",
        value: 4.6,
        valueCount: 27,
        valueUpdatedAt: "2025-07-20T09:00:00.000Z",
        description: "Most of the inner-city fountains sit inside this ring.",
        createdAt: "2025-07-01T09:00:00.000Z",
      },
    ],
    routes: [],
    reviews: [
      { spot: 0, score: 5, date: "2025-07-22", text: "Cold, clean, and right by the harbour bath. Perfect." },
      { spot: 2, score: 4, date: "2025-08-01", text: "Reliable pressure — good enough for a mid-run refill." },
    ],
    comments: [],
    photo: { spot: 0, date: "2025-07-22", color: "#3BB0A0", label: "Harbour refill" },
  },
  {
    slug: "late-night-eats",
    doc: {
      _type: "map",
      title: "Late Night Eats",
      slug: { _type: "slug", current: "late-night-eats" },
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
    spots: [
      { name: "Midnight Falafel", street: "Istedgade 42", city: "Copenhagen", zip: 1650, lat: 55.6681, lng: 12.5504, priceLevel: 1, hoursNote: "Fri–Sat to 03:00", tags: ["falafel", "open-late"], tip: "Falafel pita with extra pickles, every time.", status: "open", marker: "🌙", markerColor: "#FF8A3D" },
      { name: "The 24/7 Kiosk", street: "Nørrebrogade 86", city: "Copenhagen", zip: 2200, lat: 55.689, lng: 12.5485, priceLevel: 1, hoursNote: "Open 24 hours", tags: ["kiosk", "snacks"], tip: "Cold drinks and warm sausage rolls at 4am.", status: "open", marker: "🌙", markerColor: "#FF8A3D" },
      { name: "Late Slice Pizzeria", street: "Amagerbrogade 19", city: "Copenhagen", zip: 2300, lat: 55.6639, lng: 12.602, priceLevel: 2, hoursNote: "Daily to 02:00", tags: ["pizza", "open-late"], tip: "Ask for the pepperoni by-the-slice window.", status: "open", marker: "🌙", markerColor: "#FF8A3D" },
    ],
    zones: [
      {
        name: "Vesterbro after dark",
        shape: "circle",
        center: [55.6681, 12.5504],
        radius: 800,
        color: "#FF8A3D",
        value: 1.6,
        valueCount: 18,
        valueUpdatedAt: "2025-07-25T09:00:00.000Z",
        description: "The densest late-night kitchen cluster in the city.",
        createdAt: "2025-07-12T09:00:00.000Z",
      },
    ],
    routes: [],
    reviews: [
      { spot: 0, score: 5, date: "2025-07-29", text: "Best late falafel in town, hands down." },
      { spot: 2, score: 4, date: "2025-08-10", text: "Saved us after the late train home." },
    ],
    comments: [],
    photo: { spot: 0, date: "2025-07-29", color: "#FF8A3D", label: "Falafel till late" },
  },
];

function svgPhoto(fill, label) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">` +
    `<rect width="640" height="400" rx="8" fill="${fill}"/>` +
    `<text x="320" y="205" font-family="system-ui, sans-serif" font-size="32" fill="#ffffff" ` +
    `text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function main() {
  const mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await mongo.connect();
  const db = mongo.db(dbName);

  const existing = await sanity.fetch(
    `*[_type == "map" && slug.current in $slugs]{_id, "slug": slug.current}`,
    { slugs: maps.map((m) => m.slug) }
  );
  const idBySlug = new Map(existing.map((e) => [e.slug, e._id]));

  for (const m of maps) {
    let mapId = idBySlug.get(m.slug);

    if (!mapId) {
      const doc = await sanity.create(m.doc);
      mapId = doc._id;
      console.log(`+ Sanity map: ${m.slug} (${mapId})`);
    } else {
      console.log(`= Sanity map exists: ${m.slug} (${mapId})`);
    }

    // Idempotency: already-seeded maps keep their existing content untouched.
    const spotCount = await db
      .collection("spots")
      .countDocuments({ mapId });
    if (spotCount > 0) {
      console.log(`  - spots already exist (${spotCount}), skipping content`);
      continue;
    }

    const createdAt = new Date().toISOString();
    const base = { mapId, createdBy: null, moderation: "approved", hidden: false };

    const spotsRes = await db.collection("spots").insertMany(
      m.spots.map((s, i) => ({
        ...base,
        ...s,
        createdAt: new Date(Date.UTC(2025, 6 + (i % 5), 8 + i, 10, 0, 0)).toISOString(),
      }))
    );
    const spotIds = Object.values(spotsRes.insertedIds).map((x) => x.toString());
    console.log(`  + ${spotIds.length} spots`);

    if (m.zones.length) {
      await db.collection("zones").insertMany(
        m.zones.map((z) => ({ ...base, ...z, createdAt: z.createdAt ?? createdAt }))
      );
      console.log(`  + ${m.zones.length} zone(s)`);
    }
    if (m.routes.length) {
      await db.collection("routes").insertMany(
        m.routes.map((r) => ({ ...base, ...r, createdAt: r.createdAt ?? createdAt }))
      );
      console.log(`  + ${m.routes.length} route(s)`);
    }

    const reviewRes = await db.collection("reviews").insertMany(
      m.reviews.map((r) => ({
        spotId: spotIds[r.spot],
        review: r.text,
        score: r.score,
        date: r.date,
        user_fk: null,
        helpfulCount: 0,
      }))
    );
    const reviewIds = Object.values(reviewRes.insertedIds).map((x) => x.toString());
    console.log(`  + ${reviewIds.length} reviews`);

    if (m.comments.length) {
      const commentIds = [];
      for (const c of m.comments) {
        const res = await db.collection("comments").insertOne({
          reviewId: reviewIds[c.review],
          parentId: c.parent === null ? null : commentIds[c.parent],
          user_fk: null,
          text: c.text,
          date: c.date,
        });
        commentIds.push(res.insertedId.toString());
      }
      console.log(`  + ${commentIds.length} comment(s)`);
    }

    if (m.photo) {
      await db.collection("photos").insertOne({
        spotId: spotIds[m.photo.spot],
        dataUrl: svgPhoto(m.photo.color, m.photo.label),
        uploader_fk: null,
        date: m.photo.date,
      });
      console.log("  + 1 photo");
    }

    console.log(`  mapId=${mapId}`);
  }

  await mongo.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
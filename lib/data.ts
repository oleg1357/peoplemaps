export interface Review {
  id: number;
  spot_fk: number;
  review: string;
  score: number;
  date: string;
  user_fk?: number | null;
}

// Categories/labels used to filter spots on the map.
export const SPOT_CATEGORIES = [
  "grocery",
  "bakery",
  "producer",
  "restaurant",
  "park",
  "other",
] as const;

export type SpotCategory = (typeof SPOT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SpotCategory, string> = {
  grocery: "Grocery",
  bakery: "Bakery",
  producer: "Producer",
  restaurant: "Restaurant",
  park: "Park",
  other: "Other",
};

// A place people have put on the shared demo map.
export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
  city: string;
  street: string;
  zip: number;
  category: SpotCategory;
}

export interface SpotMarker {
  id: number;
  latlng: [number, number];
  brand: string;
  city: string;
  street: string;
  zip: number;
  avgScore: number;
  date: string;
  is_saved: number | null;
  note?: string;
  category: SpotCategory;
}

export interface SavedSpot {
  spot_fk: number;
  lat: number;
  lng: number;
  name: string;
  city: string;
  street: string;
  zip: number;
  note: string;
  avgScore: number;
  category: SpotCategory;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userPassword: string;
}

export interface NewSpot {
  id: number;
  placeName: string;
  address: string;
  city: string;
  zip: number;
  lat: number;
  lng: number;
  review: string;
  score: number;
  date: string;
  user_fk?: number | null;
}

export interface ReviewComment {
  id: number;
  reviewId: number;
  user_fk: number | null;
  text: string;
  date: string;
}

export interface ReviewPhoto {
  id: number;
  spot_fk: number;
  dataUrl: string;
  uploader_fk: number | null;
  date: string;
}

export const INITIAL_PLACES: Place[] = [
  { id: 1, name: "Netto", lat: 55.6854, lng: 12.5575, city: "Copenhagen", street: "Falkoner Allé 55", zip: 2000, category: "grocery" },
  { id: 2, name: "Føtex", lat: 55.6771, lng: 12.5634, city: "Copenhagen", street: "Vesterbrogade 50", zip: 1620, category: "grocery" },
  { id: 3, name: "Rema 1000", lat: 55.6898, lng: 12.5521, city: "Copenhagen", street: "Godthåbsvej 8", zip: 2000, category: "grocery" },
  { id: 4, name: "Aldi", lat: 55.6706, lng: 12.5794, city: "Copenhagen", street: "Amagerbrogade 112", zip: 2300, category: "grocery" },
  { id: 5, name: "Lidl", lat: 55.6815, lng: 12.5736, city: "Copenhagen", street: "Nørrebrogade 142", zip: 2200, category: "grocery" },
  { id: 6, name: "SuperBrugsen", lat: 55.6837, lng: 12.5442, city: "Frederiksberg", street: "Smakkegårdsvej 141", zip: 2820, category: "grocery" },
  { id: 7, name: "Meny", lat: 55.6647, lng: 12.5958, city: "Copenhagen", street: "Tårnby Torv 5", zip: 2770, category: "grocery" },
  { id: 8, name: "Irma", lat: 55.6862, lng: 12.5869, city: "Copenhagen", street: "Østerbrogade 57", zip: 2100, category: "grocery" },
  { id: 9, name: "365 discount", lat: 55.6746, lng: 12.5883, city: "Copenhagen", street: "Ørestads Boulevard 90", zip: 2300, category: "grocery" },
  { id: 10, name: "Netto", lat: 55.6782, lng: 12.5984, city: "Copenhagen", street: "Holmbladsgade 37", zip: 2300, category: "grocery" },
  { id: 11, name: "Rema 1000", lat: 55.6931, lng: 12.5389, city: "Copenhagen", street: "Vibevej 22", zip: 2400, category: "grocery" },
  { id: 12, name: "Aldi", lat: 55.6872, lng: 12.5174, city: "Copenhagen", street: "Jernbane Allé 45", zip: 2720, category: "grocery" },
];

export const INITIAL_REVIEWS: Review[] = [
  { id: 1, spot_fk: 1, review: "Great finds after closing time on Sundays.", score: 4, date: "2025-06-12" },
  { id: 2, spot_fk: 1, review: "Lots of bread and pastries.", score: 5, date: "2025-07-03", user_fk: 1 },
  { id: 3, spot_fk: 1, review: "", score: 3, date: "2025-08-20" },
  { id: 4, spot_fk: 3, review: "Clean spot, but check late at night.", score: 3, date: "2025-05-18" },
  { id: 5, spot_fk: 3, review: "Found veggies every time.", score: 4, date: "2025-07-27", user_fk: 1 },
  { id: 6, spot_fk: 4, review: "Avoid on weekends, too crowded.", score: 2, date: "2025-06-01" },
  { id: 7, spot_fk: 4, review: "Good fruit.", score: 4, date: "2025-08-05" },
  { id: 8, spot_fk: 6, review: "", score: 3, date: "2025-04-22" },
  { id: 9, spot_fk: 6, review: "Top spot, always something fresh.", score: 5, date: "2025-08-11", user_fk: 1 },
  { id: 10, spot_fk: 8, review: "Quiet area, easy access.", score: 4, date: "2025-07-15" },
  { id: 11, spot_fk: 10, review: "Nice selection of dairy.", score: 4, date: "2025-08-02", user_fk: 1 },
  { id: 12, spot_fk: 12, review: "", score: 3, date: "2025-06-25" },
];

export { INITIAL_USERS } from "./auth-data";
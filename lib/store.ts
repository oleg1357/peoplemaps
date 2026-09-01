import {
  INITIAL_PLACES,
  INITIAL_REVIEWS,
  INITIAL_USERS,
  type Place,
  type Review,
  type User,
  type SavedSpot,
  type NewSpot,
  type SpotMarker,
  type ReviewComment,
  type ReviewPhoto,
} from "./data";

const KEYS = {
  users: "peoplemaps_users",
  reviews: "peoplemaps_reviews",
  places: "peoplemaps_places",
  saved: "peoplemaps_saved",
  newSpots: "peoplemaps_new_spots",
  userId: "peoplemaps_user_id",
  status: "peoplemaps_spot_status",
  votes: "peoplemaps_review_votes",
  comments: "peoplemaps_review_comments",
  photos: "peoplemaps_spot_photos",
  watches: "peoplemaps_spot_watches",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getAllPlaces(): Place[] {
  return read(KEYS.places, INITIAL_PLACES);
}

function savePlaces(places: Place[]): void {
  write(KEYS.places, places);
}

function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function getPlacesMagic(): { isMobile: boolean; places: Place[] } {
  return { isMobile: detectMobile(), places: getAllPlaces() };
}

export function getSpotMarkers(userId: string | null): SpotMarker[] {
  const places = getAllPlaces();
  const saved = getSavedEntries();
  const reviews = getAllReviews();
  return places.map((s) => {
    const spotReviews = reviews.filter((r) => r.spot_fk === s.id);
    const avg =
      spotReviews.length === 0
        ? 0
        : spotReviews.reduce((sum, r) => sum + r.score, 0) / spotReviews.length;
    const savedEntry = userId
      ? saved.find((e) => e.user_fk === Number(userId) && e.spot_fk === s.id)
      : undefined;
    return {
      id: s.id,
      latlng: [s.lat, s.lng],
      brand: s.name,
      city: s.city,
      street: s.street,
      zip: s.zip,
      avgScore: avg,
      date: "",
      is_saved: savedEntry ? 1 : null,
      note: savedEntry?.note,
      category: s.category,
    };
  });
}

// Every place is a spot on the shared map.
export function getAllPlaceMarkers(): SpotMarker[] {
  return getAllPlaces().map((s) => ({
    id: s.id,
    latlng: [s.lat, s.lng],
    brand: s.name,
    city: s.city,
    street: s.street,
    zip: s.zip,
    avgScore: 0,
    date: "",
    is_saved: null,
    category: s.category,
  }));
}

export function getAllReviews(): Review[] {
  return read(KEYS.reviews, INITIAL_REVIEWS);
}

function saveReviews(reviews: Review[]): void {
  write(KEYS.reviews, reviews);
}

export function getSpotDetails(
  spotId: number,
  userId?: string | null
): {
  reviews: {
    id: number;
    review: string;
    score: number;
    date: string;
    user_fk: number | null;
    authorName: string;
    helpful: number;
    helpfulVoted: boolean;
    comments: { id: number; user_fk: number | null; authorName: string; text: string; date: string }[];
  }[];
  photos: ReviewPhoto[];
} {
  const reviews = getAllReviews()
    .filter((r) => r.spot_fk === spotId)
    .map((r) => ({
      id: r.id,
      review: r.review,
      score: r.score,
      date: r.date,
      user_fk: r.user_fk ?? null,
      authorName: getAuthorName(r.user_fk ?? null),
      helpful: getReviewHelpfulCount(r.id),
      helpfulVoted: userId ? hasVotedHelpful(r.id, userId) : false,
      comments: getCommentsForReview(r.id),
    }));
  return { reviews, photos: getPhotosForSpot(spotId) };
}

interface SavedEntry {
  user_fk: number;
  spot_fk: number;
  note: string;
}

export function getSavedEntries(): SavedEntry[] {
  return read(KEYS.saved, []);
}

export function saveToSaved(
  userId: string | null,
  spotId: number,
  note: string
): void {
  if (!userId) return;
  const saved = getSavedEntries().filter(
    (e) => !(e.user_fk === Number(userId) && e.spot_fk === spotId)
  );
  saved.push({ user_fk: Number(userId), spot_fk: spotId, note });
  write(KEYS.saved, saved);
}

export function getSavedSpots(userId: string | null): SavedSpot[] {
  const saved = getSavedEntries().filter((e) => e.user_fk === Number(userId));
  const places = getAllPlaces();
  const reviews = getAllReviews();
  return saved.map((e) => {
    const s = places.find((st) => st.id === e.spot_fk);
    const spotReviews = reviews.filter((r) => r.spot_fk === e.spot_fk);
    const avg =
      spotReviews.length === 0
        ? 0
        : spotReviews.reduce((sum, r) => sum + r.score, 0) / spotReviews.length;
    return {
      spot_fk: e.spot_fk,
      lat: s?.lat ?? 0,
      lng: s?.lng ?? 0,
      name: s?.name ?? "",
      city: s?.city ?? "",
      street: s?.street ?? "",
      zip: s?.zip ?? 0,
      note: e.note,
      avgScore: avg,
      category: s?.category ?? "other",
    };
  });
}

export function addReview(
  spotId: number,
  score: number,
  review: string,
  userId?: string | null
): void {
  const reviews = getAllReviews();
  const nextId = reviews.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  const date = new Date().toISOString().slice(0, 10);
  reviews.push({
    id: nextId,
    spot_fk: spotId,
    review,
    score,
    date,
    user_fk: userId ? Number(userId) : null,
  });
  saveReviews(reviews);
}

export function updateReview(
  reviewId: number,
  review: string,
  score: number
): void {
  const reviews = getAllReviews().map((r) =>
    r.id === reviewId ? { ...r, review, score } : r
  );
  saveReviews(reviews);
}

export function deleteReview(reviewId: number): void {
  saveReviews(getAllReviews().filter((r) => r.id !== reviewId));
}

export function getLatestReviewDate(spotId: number): string | null {
  const dates = getAllReviews()
    .filter((r) => r.spot_fk === spotId && r.date)
    .map((r) => r.date);
  if (dates.length === 0) return null;
  return dates.sort((a, b) => (a > b ? -1 : 1))[0];
}

export function addNewLocation(
  input: {
    placeName: string;
    address: string;
    city: string;
    zip: number;
    lat: number;
    lng: number;
    review: string;
    score: number;
  },
  userId?: string | null
): void {
  const places = getAllPlaces();
  const nextId = places.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  places.push({
    id: nextId,
    name: input.placeName,
    lat: input.lat,
    lng: input.lng,
    city: input.city,
    street: input.address,
    zip: input.zip,
    category: "other",
  });
  savePlaces(places);

  const reviews = getAllReviews();
  const nextReviewId =
    reviews.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  reviews.push({
    id: nextReviewId,
    spot_fk: nextId,
    review: input.review,
    score: input.score,
    date: new Date().toISOString().slice(0, 10),
    user_fk: userId ? Number(userId) : null,
  });
  saveReviews(reviews);

  const newSpots = getNewSpots();
  newSpots.push({
    id: nextId,
    placeName: input.placeName,
    address: input.address,
    city: input.city,
    zip: input.zip,
    lat: input.lat,
    lng: input.lng,
    review: input.review,
    score: input.score,
    date: new Date().toISOString().slice(0, 10),
    user_fk: userId ? Number(userId) : null,
  });
  write(KEYS.newSpots, newSpots);
}

export function getNewSpots(): NewSpot[] {
  return read(KEYS.newSpots, []);
}

export function getNewSpotsSince(lastVisited: string | null): number {
  const list = getNewSpots();
  if (!lastVisited) return list.length;
  return list.filter((d) => d.date > lastVisited).length;
}

// ---- Spot status ----
export type SpotStatus = "open" | "closed" | "unknown";

export function getSpotStatus(spotId: number): SpotStatus {
  const all = read<Record<number, SpotStatus>>(KEYS.status, {});
  return all[spotId] ?? "unknown";
}

export function getAllSpotStatuses(): Record<number, SpotStatus> {
  return read<Record<number, SpotStatus>>(KEYS.status, {});
}

export function setSpotStatus(spotId: number, status: SpotStatus): void {
  const all = read<Record<number, SpotStatus>>(KEYS.status, {});
  if (status === "unknown") {
    delete all[spotId];
  } else {
    all[spotId] = status;
  }
  write(KEYS.status, all);
}

// ---- Review helpful votes ----
interface ReviewVote {
  reviewId: number;
  userId: number;
}

function getVotes(): ReviewVote[] {
  return read<ReviewVote[]>(KEYS.votes, []);
}

export function getReviewHelpfulCount(reviewId: number): number {
  return getVotes().filter((v) => v.reviewId === reviewId).length;
}

export function hasVotedHelpful(reviewId: number, userId: string): boolean {
  return getVotes().some(
    (v) => v.reviewId === reviewId && v.userId === Number(userId)
  );
}

export function toggleHelpfulReview(
  reviewId: number,
  userId: string | null
): { count: number; voted: boolean } {
  const uid = Number(userId);
  if (!userId || !Number.isFinite(uid)) {
    return { count: getReviewHelpfulCount(reviewId), voted: false };
  }
  let votes = getVotes();
  const existing = votes.find(
    (v) => v.reviewId === reviewId && v.userId === uid
  );
  if (existing) {
    votes = votes.filter((v) => !(v.reviewId === reviewId && v.userId === uid));
  } else {
    votes.push({ reviewId, userId: uid });
  }
  write(KEYS.votes, votes);
  return {
    count: votes.filter((v) => v.reviewId === reviewId).length,
    voted: !existing,
  };
}

// ---- Author helpers ----
export function getAuthorName(user_fk: number | null): string {
  if (user_fk === null || user_fk === undefined) return "Anonymous";
  const u = getUsers().find((x) => x.id === user_fk);
  return u ? `${u.firstName} ${u.lastName}` : "Anonymous";
}

export function getNewSpotAuthor(spotId: number): number | null {
  return getNewSpots().find((d) => d.id === spotId)?.user_fk ?? null;
}

export function getReviewsByUser(userId: number): Review[] {
  return getAllReviews().filter((r) => r.user_fk === userId);
}

export function getPhotosByUser(userId: number): ReviewPhoto[] {
  return read<ReviewPhoto[]>(KEYS.photos, []).filter(
    (p) => p.uploader_fk === userId
  );
}

// ---- Review comments ----
function getComments(): ReviewComment[] {
  return read<ReviewComment[]>(KEYS.comments, []);
}

function getCommentsForReview(reviewId: number) {
  return getComments()
    .filter((c) => c.reviewId === reviewId)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((c) => ({
      id: c.id,
      user_fk: c.user_fk,
      authorName: getAuthorName(c.user_fk),
      text: c.text,
      date: c.date,
    }));
}

export function getCommentCount(reviewId: number): number {
  return getComments().filter((c) => c.reviewId === reviewId).length;
}

export function addComment(
  reviewId: number,
  text: string,
  userId?: string | null
): void {
  const comments = getComments();
  const nextId = comments.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  comments.push({
    id: nextId,
    reviewId,
    user_fk: userId ? Number(userId) : null,
    text,
    date: new Date().toISOString().slice(0, 10),
  });
  write(KEYS.comments, comments);
}

// ---- Spot photos ----
function getPhotos(): ReviewPhoto[] {
  return read<ReviewPhoto[]>(KEYS.photos, []);
}

function getPhotosForSpot(spotId: number): ReviewPhoto[] {
  return getPhotos()
    .filter((p) => p.spot_fk === spotId)
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function addSpotPhoto(
  spotId: number,
  dataUrl: string,
  userId?: string | null
): void {
  const photos = getPhotos();
  const nextId = photos.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const newPhoto: ReviewPhoto = {
    id: nextId,
    spot_fk: spotId,
    dataUrl,
    uploader_fk: userId ? Number(userId) : null,
    date: new Date().toISOString().slice(0, 10),
  };
  photos.push(newPhoto);
  const kept = photos.slice(-6);
  write(KEYS.photos, kept);
}

export function getSpotPhotosCount(spotId: number): number {
  return getPhotos().filter((p) => p.spot_fk === spotId).length;
}

// ---- Spot watchlist ----
interface WatchEntry {
  userId: number;
  spotId: number;
}

function getWatches(): WatchEntry[] {
  return read<WatchEntry[]>(KEYS.watches, []);
}

export function isWatching(spotId: number, userId?: string | null): boolean {
  if (!userId) return false;
  return getWatches().some(
    (w) => w.spotId === spotId && w.userId === Number(userId)
  );
}

export function toggleWatch(
  spotId: number,
  userId?: string | null
): boolean {
  if (!userId) return false;
  const uid = Number(userId);
  let watches = getWatches();
  const existing = watches.find(
    (w) => w.spotId === spotId && w.userId === uid
  );
  if (existing) {
    watches = watches.filter((w) => !(w.spotId === spotId && w.userId === uid));
  } else {
    watches.push({ userId: uid, spotId });
  }
  write(KEYS.watches, watches);
  return !existing;
}

// Returns watch entries (userId, spotId, spot name, review author name) for new reviews
// that arrived after the last time the user was notified (per user timestamp).
export function getWatchAlerts(): Array<{
  spotId: number;
  spotName: string;
  reviewAuthor: string;
}> {
  if (typeof window === "undefined") return [];
  const lastNotified: Record<string, string> = JSON.parse(
    window.localStorage.getItem("peoplemaps_watch_lastNotified") || "{}"
  );
  const reviews = getAllReviews();
  const places = getAllPlaces();
  const users = getUsers();
  const out: Array<{
    spotId: number;
    spotName: string;
    reviewAuthor: string;
  }> = [];
  getWatches().forEach((w) => {
    const since = lastNotified[String(w.userId)];
    const newReviews = reviews.filter(
      (r) =>
        r.spot_fk === w.spotId &&
        r.user_fk !== w.userId && // don't alert on your own review
        (!since || r.date > since)
    );
    if (newReviews.length === 0) return;
    const place = places.find((s) => s.id === w.spotId);
    const author = users.find((u) => u.id === newReviews[0].user_fk);
    out.push({
      spotId: w.spotId,
      spotName: place ? place.name : "a spot",
      reviewAuthor: author
        ? `${author.firstName} ${author.lastName}`
        : "Someone",
    });
  });
  return out;
}

export function markWatchAlertsNotified(): void {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const map: Record<string, string> = {};
  getWatches().forEach((w) => {
    map[String(w.userId)] = today;
  });
  window.localStorage.setItem(
    "peoplemaps_watch_lastNotified",
    JSON.stringify(map)
  );
}

// ---- Auth ----
export function getUsers(): User[] {
  return read(KEYS.users, INITIAL_USERS);
}

export function getLoggedInUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEYS.userId);
}

export function setLoggedInUser(userId: number | string): void {
  write(KEYS.userId, String(userId));
}

export function clearLoggedInUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS.userId);
}

export function signup(
  firstName: string,
  lastName: string,
  email: string,
  userPassword: string
): { ok: boolean; message: string } {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, message: "This email is already registered." };
  }
  const nextId = users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
  users.push({ id: nextId, firstName, lastName, email, userPassword });
  write(KEYS.users, users);
  setLoggedInUser(nextId);
  return { ok: true, message: "Account created!" };
}

export function login(
  email: string,
  userPassword: string
): { ok: boolean; message: string; userId?: number } {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (!user || user.userPassword !== userPassword) {
    return { ok: false, message: "Invalid email or password." };
  }
  setLoggedInUser(user.id);
  return { ok: true, message: "Logged in", userId: user.id };
}

export function getUser(userId: string | null): User | null {
  if (!userId) return null;
  const users = getUsers();
  return users.find((u) => u.id === Number(userId)) || null;
}
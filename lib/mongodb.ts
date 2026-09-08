import { MongoClient, type Db } from "mongodb";

const uri: string | undefined = process.env.MONGODB_URI;
const dbName: string = process.env.MONGODB_DB || "peoplemaps";

const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

export const mongoConfigured = Boolean(uri);

function getClient(): MongoClient | null {
  if (!mongoConfigured) return null;
  if (globalForMongo._mongoClient) return globalForMongo._mongoClient;
  const client = new MongoClient(uri as string, {
    // Next.js dev hot-reload shares the client across modules
    maxPoolSize: 10,
    // Fail fast when the database is unreachable instead of hanging ~30s.
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 2500),
  });
  globalForMongo._mongoClient = client;
  return client;
}

let cachedDb: Db | null = null;

// Last known connection failure; requests short-circuit for a short window so
// degraded calls (e.g. admin map list) fail fast instead of waiting the full
// server-selection timeout on every request.
let dbDownUntil = 0;
const DB_DOWN_WINDOW_MS = 30_000;

export async function getDb(): Promise<Db | null> {
  if (!mongoConfigured) return null;
  if (Date.now() < dbDownUntil) throw new Error("Database is unreachable.");
  if (cachedDb) return cachedDb;
  const client = getClient();
  if (!client) return null;
  try {
    await client.connect();
    cachedDb = client.db(dbName);
    dbDownUntil = 0;
    return cachedDb;
  } catch (err) {
    dbDownUntil = Date.now() + DB_DOWN_WINDOW_MS;
    throw err;
  }
}

// Collection name helpers (kept in one place).
export const COLLECTIONS = {
  spots: "spots",
  reviews: "reviews",
  comments: "comments",
  photos: "photos",
  votes: "votes",
  mapRoles: "map_roles",
  zones: "zones",
  routes: "routes",
  activityLog: "activity_log",
  reports: "reports",
  bans: "bans",
  mapRules: "map_rules",
  profiles: "profiles",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

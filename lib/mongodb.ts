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
  });
  globalForMongo._mongoClient = client;
  return client;
}

let cachedDb: Db | null = null;

export async function getDb(): Promise<Db | null> {
  if (!mongoConfigured) return null;
  if (cachedDb) return cachedDb;
  const client = getClient();
  if (!client) return null;
  await client.connect();
  cachedDb = client.db(dbName);
  return cachedDb;
}

// Collection name helpers (kept in one place).
export const COLLECTIONS = {
  spots: "spots",
  reviews: "reviews",
  comments: "comments",
  photos: "photos",
  votes: "votes",
  saved: "saved",
  watches: "watches",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

import { MongoClient, type Db } from "mongodb";
import { env } from "../config/env.js";

export const DB_NAME = "sidebar";

let client: MongoClient | undefined;
let db: Db | undefined;

/**
 * Lazily-connected singleton. Only this module (and seed/eval scripts) may hold
 * MONGODB_URI — apps/web never imports it (spec 03 §Access policy).
 */
export async function getDb(): Promise<Db> {
  if (db) return db;
  if (!env.mongodbUri) {
    throw new Error(
      "MONGODB_URI is not set — required for any DB-backed request. Use DEMO_MODE=1 to run without Atlas.",
    );
  }
  client = new MongoClient(env.mongodbUri);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = undefined;
  db = undefined;
}

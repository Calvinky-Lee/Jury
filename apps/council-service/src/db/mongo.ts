// Minimal Mongo client helper. NOTE: db/ is P4-owned territory (spec 01) —
// this is the smallest possible placeholder so P2's retrieval works; P4
// replaces/extends it when the service scaffold lands.
import { MongoClient, type Db } from 'mongodb'

export const DB_NAME = 'council'

let client: MongoClient | undefined

export function getDb(): Db {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  client ??= new MongoClient(uri)
  return client.db(DB_NAME)
}

export async function closeDb(): Promise<void> {
  await client?.close()
  client = undefined
}

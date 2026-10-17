import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof createDrizzle> | undefined;
let initPromise: Promise<ReturnType<typeof createDrizzle>> | undefined;

function createDrizzle() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const client = new Client({ connectionString });
  const db = drizzle(client, { schema: fullSchema });
  initPromise = client
    .connect()
    .then(() => db)
    .catch((error) => {
      instance = undefined;
      initPromise = undefined;
      throw error;
    });

  return db;
}

export function getDb() {
  if (!instance) {
    instance = createDrizzle();
  }
  return instance;
}

export async function ensureDbReady() {
  if (!instance) {
    getDb();
  }
  if (!initPromise) {
    throw new Error("Database initialization failed");
  }
  await initPromise;
  return instance!;
}

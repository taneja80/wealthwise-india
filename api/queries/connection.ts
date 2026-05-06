import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof createDrizzle> | undefined;

function createDrizzle() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const client = new Client({ connectionString });
  client.connect();
  return drizzle(client, { schema: fullSchema });
}

export function getDb() {
  if (!instance) {
    instance = createDrizzle();
  }
  return instance;
}

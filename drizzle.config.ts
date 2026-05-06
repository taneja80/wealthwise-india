import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const isPostgres = connectionString.startsWith("postgres://") || connectionString.startsWith("postgresql://");

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: isPostgres ? "postgresql" : "mysql",
  dbCredentials: {
    url: connectionString,
  },
});

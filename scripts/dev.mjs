/**
 * Dev entry point: starts the embedded Postgres (when DATABASE_URL points at the
 * local embedded instance or is unset), applies migrations, then launches Vite.
 * Extra CLI args (e.g. --port 7100 --host) are forwarded to Vite.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import "dotenv/config";

const EMBEDDED_URL = "postgresql://wealthwise:wealthwise@localhost:5544/wealthwise";
const isEmbedded = !process.env.DATABASE_URL || process.env.DATABASE_URL === EMBEDDED_URL;

let pg = null;

if (isEmbedded) {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  pg = new EmbeddedPostgres({
    databaseDir: "./.pgdata",
    user: "wealthwise",
    password: "wealthwise",
    port: 5544,
    persistent: true,
  });
  if (!existsSync("./.pgdata/PG_VERSION")) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("wealthwise");
  } catch {
    // database already exists
  }
  process.env.DATABASE_URL = EMBEDDED_URL;

  // Apply migrations so a fresh clone works on first run
  const { default: pgDriver } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const client = new pgDriver.Client({ connectionString: EMBEDDED_URL });
  await client.connect();
  await migrate(drizzle(client), { migrationsFolder: "./db/migrations" });
  await client.end();
  console.log("[dev-db] embedded Postgres ready, migrations applied");
}

const vite = spawn("npx", ["vite", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  try {
    if (pg) await pg.stop();
  } finally {
    process.exit(code);
  }
}

vite.on("exit", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

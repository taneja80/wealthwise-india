/**
 * Starts a local embedded Postgres for development and prints the DATABASE_URL.
 * Data persists in .pgdata/ so you can stop and restart without losing data.
 * Usage: node scripts/dev-db.mjs  (keep running while you use the app)
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, readFileSync, rmSync } from "node:fs";

// Remove a stale postmaster.pid left behind by an unclean shutdown —
// Postgres refuses to start while it exists and the recorded PID is dead.
const pidFile = "./.pgdata/postmaster.pid";
if (existsSync(pidFile)) {
  const pid = Number(readFileSync(pidFile, "utf8").split("\n")[0].trim());
  let alive = false;
  if (pid) {
    try {
      process.kill(pid, 0);
      alive = true;
    } catch {
      alive = false;
    }
  }
  if (!alive) rmSync(pidFile, { force: true });
}

const pg = new EmbeddedPostgres({
  databaseDir: "./.pgdata",
  user: "wealthwise",
  password: "wealthwise",
  port: 5544,
  persistent: true,
});

// initialise() runs initdb, which fails on an existing cluster — skip it then
if (!existsSync("./.pgdata/PG_VERSION")) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("wealthwise");
} catch {
  // database already exists — fine
}

console.log("Postgres ready at postgresql://wealthwise:wealthwise@localhost:5544/wealthwise");

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import dotenv from "dotenv"

dotenv.config()

const EMBEDDED_DB_URL = "postgresql://wealthwise:wealthwise@localhost:5544/wealthwise"

/**
 * In dev, guarantee a working database no matter how Vite was launched
 * (npm run dev, npx vite, or the IDE preview). If DATABASE_URL is not set,
 * boot the embedded Postgres in .pgdata/ and apply migrations.
 */
async function ensureDevDatabase() {
  const url = process.env.DATABASE_URL
  // Only manage the DB when it's the local embedded instance (or unset).
  // A custom/remote DATABASE_URL is left untouched.
  if (url && url !== EMBEDDED_DB_URL) return
  try {
    const { existsSync } = await import("node:fs")
    // Remove a stale postmaster.pid left behind by an unclean shutdown —
    // Postgres refuses to start while it exists and the recorded PID is dead.
    const pidFile = path.resolve(__dirname, ".pgdata/postmaster.pid")
    if (existsSync(pidFile)) {
      const { readFileSync, rmSync } = await import("node:fs")
      const pid = Number(readFileSync(pidFile, "utf8").split("\n")[0].trim())
      let alive = false
      if (pid) {
        try {
          process.kill(pid, 0)
          alive = true
        } catch {
          alive = false
        }
      }
      if (!alive) rmSync(pidFile, { force: true })
    }
    const { default: EmbeddedPostgres } = await import("embedded-postgres")
    const pg = new EmbeddedPostgres({
      databaseDir: path.resolve(__dirname, ".pgdata"),
      user: "wealthwise",
      password: "wealthwise",
      port: 5544,
      persistent: true,
    })
    if (!existsSync(path.resolve(__dirname, ".pgdata/PG_VERSION"))) {
      await pg.initialise()
    }
    try {
      await pg.start()
    } catch {
      // another dev process already started it — connecting will still work
    }
    try {
      await pg.createDatabase("wealthwise")
    } catch {
      // database already exists
    }
    const { default: pgDriver } = await import("pg")
    const { drizzle } = await import("drizzle-orm/node-postgres")
    const { migrate } = await import("drizzle-orm/node-postgres/migrator")
    const client = new pgDriver.Client({ connectionString: EMBEDDED_DB_URL })
    await client.connect()
    await migrate(drizzle(client), { migrationsFolder: path.resolve(__dirname, "db/migrations") })
    await client.end()
    process.env.DATABASE_URL = EMBEDDED_DB_URL
    console.log("[dev-db] embedded Postgres ready, migrations applied")
  } catch (error) {
    console.warn("[dev-db] embedded Postgres failed to start:", error)
  }
}

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
  if (command === "serve") {
    await ensureDevDatabase()
  }
  return {
    plugins: [
      devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
      react()],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@contracts": path.resolve(__dirname, "./contracts"),
        "@db": path.resolve(__dirname, "./db"),
        "db": path.resolve(__dirname, "./db"),
      },
    },
    envDir: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
  }
})

# Hosting WealthWise India (Free Tier)

The app is a full-stack Node.js service (Vite frontend + Hono/tRPC API + Postgres)
and ships with a Render blueprint (`render.yaml`), so hosting is mostly clicking.

## Option A — Render (recommended, uses the included blueprint)

1. Sign up at [render.com](https://render.com) with your GitHub account.
2. Dashboard → **New → Blueprint** → select the `wealthwise-india` repo.
3. Render detects `render.yaml` and provisions:
   - **Web service** (free plan) — builds with `npm install --include=dev && npm run build`; on each boot it syncs the database schema (`drizzle-kit push`) and then starts with `npm start`
   - **Postgres database** (free plan) — connection string is injected as `DATABASE_URL` automatically
   - `JWT_SECRET` is auto-generated
4. Leave `OLLAMA_URL` / `OLLAMA_MODEL` blank unless you want the AI chat
   feature backed by a remote Ollama instance.
5. Your app goes live at `https://<service-name>.onrender.com`.

### Free-tier caveats

- **Sleep:** free web services sleep after ~15 minutes of inactivity; the first
  visit after sleep takes 30–60 seconds (cold start).
- **Database expiry:** Render's free Postgres expires after 30 days. For a
  permanent free database, use [Neon](https://neon.tech) (free tier, no expiry):
  create a project, copy the pooled connection string, and set it as the
  `DATABASE_URL` env var on the Render service (overriding the bundled one).

## Keep it awake (optional)

The app exposes a lightweight health endpoint used by Render's health check:

```
GET /api/ping   →   {"ok":true,"ts":...}
```

Point a free [UptimeRobot](https://uptimerobot.com) HTTP monitor at
`https://<your-app>.onrender.com/api/ping` every 5 minutes to prevent sleeping.

## Option B — Railway / Fly.io

- **Railway:** import the repo, add a Postgres plugin, set `DATABASE_URL` and
  `JWT_SECRET`. $5 trial credit, then paid.
- **Fly.io:** `fly launch` with a Dockerfile; small VMs are nearly free but
  require a card on file.

## Not recommended: Vercel/Netlify alone

Those platforms are static/serverless; the Hono API would need to be rewritten
as serverless functions. Render runs the app as-is.

## Local development

```bash
npm run dev        # boots embedded Postgres + migrations + Vite, one command
```

A custom/remote `DATABASE_URL` in `.env` overrides the embedded database.

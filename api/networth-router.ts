import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { assetHoldings, financialProfiles, netWorthSnapshots } from "@db/schema";
import { and, asc, eq } from "drizzle-orm";
import { refreshAllNavValues, refreshLivePrices } from "./asset-router";

/** Minimum interval between valuation refreshes triggered by snapshots. */
export const VALUATION_REFRESH_THROTTLE_MS = 15 * 60 * 1000;

// In-memory per-user throttle so repeated dashboard visits don't hammer AMFI/Yahoo
const lastValuationRefresh = new Map<number, number>();

/** Whether a valuation refresh should run now for a given last-refresh timestamp. */
export function shouldRefreshValuations(
  lastRefreshAt: number | undefined,
  now: number,
  throttleMs: number = VALUATION_REFRESH_THROTTLE_MS,
): boolean {
  return lastRefreshAt === undefined || now - lastRefreshAt >= throttleMs;
}

type HoldingLike = {
  assetClass: string;
  currentValue: number | string;
};

type FinancialProfileLike = {
  totalAssets: number | string | null;
  totalLiabilities: number | string | null;
} | null | undefined;

export type SnapshotTotals = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: Record<string, number>;
  source: "holdings" | "profile";
};

/**
 * Compute the point-in-time net worth for a snapshot.
 * Prefers the granular asset holdings when any exist; otherwise falls back to
 * the lump-sum totals on the financial profile (the same number the dashboard
 * headline shows). Liabilities always come from the financial profile, since
 * there is no loan-level tracking yet.
 */
export function computeSnapshotTotals(
  holdings: HoldingLike[],
  financialProfile: FinancialProfileLike,
): SnapshotTotals {
  const totalLiabilities = Number(financialProfile?.totalLiabilities ?? 0) || 0;

  const breakdown: Record<string, number> = {};
  let holdingsTotal = 0;
  for (const h of holdings) {
    const value = Number(h.currentValue) || 0;
    if (value <= 0) continue;
    breakdown[h.assetClass] = (breakdown[h.assetClass] ?? 0) + value;
    holdingsTotal += value;
  }

  const source = holdingsTotal > 0 ? "holdings" : "profile";
  const totalAssets =
    source === "holdings" ? holdingsTotal : Number(financialProfile?.totalAssets ?? 0) || 0;

  return {
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
    breakdown: source === "holdings" ? breakdown : {},
    source,
  };
}

function todayString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const netWorthRouter = createRouter({
  /**
   * Record today's net worth. Idempotent per day: calling it again on the same
   * day replaces the earlier snapshot instead of creating duplicates.
   * Pass { refresh: true } to revalue MF holdings (AMFI) and ticker-linked
   * holdings (live market prices) before recording — throttled per user so
   * repeated visits within 15 minutes skip the external calls.
   */
  snapshot: authedQuery
    .input(z.object({ refresh: z.boolean().default(false) }).optional())
    .mutation(async ({ ctx, input }) => {
    const db = getDb();
    const userId = ctx.user.id;

    if (input?.refresh && shouldRefreshValuations(lastValuationRefresh.get(userId), Date.now())) {
      lastValuationRefresh.set(userId, Date.now());
      // Valuation refresh is best-effort — never let it block the snapshot
      await refreshAllNavValues(db, userId).catch(() => undefined);
      await refreshLivePrices(db, userId).catch(() => undefined);
    }

    const [holdings, fProfile] = await Promise.all([
      db.query.assetHoldings.findMany({ where: eq(assetHoldings.userId, userId) }),
      db.query.financialProfiles.findFirst({ where: eq(financialProfiles.userId, userId) }),
    ]);

    const totals = computeSnapshotTotals(holdings, fProfile);
    const date = todayString();

    await db.transaction(async (tx) => {
      await tx
        .delete(netWorthSnapshots)
        .where(and(eq(netWorthSnapshots.userId, userId), eq(netWorthSnapshots.date, date)));
      await tx.insert(netWorthSnapshots).values({
        userId,
        date,
        totalAssets: String(totals.totalAssets),
        totalLiabilities: String(totals.totalLiabilities),
        netWorth: String(totals.netWorth),
        breakdown: totals.breakdown,
      });
    });

    return { date, ...totals };
  }),

  /** Net worth history, oldest first, for trend charts. */
  history: authedQuery
    .input(z.object({ limit: z.number().int().min(1).max(2000).default(366) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db.query.netWorthSnapshots.findMany({
        where: eq(netWorthSnapshots.userId, ctx.user.id),
        orderBy: [asc(netWorthSnapshots.date)],
        limit: input?.limit ?? 366,
      });
      return rows.map((r) => ({
        id: r.id,
        date: r.date,
        totalAssets: Number(r.totalAssets),
        totalLiabilities: Number(r.totalLiabilities),
        netWorth: Number(r.netWorth),
        breakdown: r.breakdown ?? {},
      }));
    }),
});

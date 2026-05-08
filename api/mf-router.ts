import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

// ---- Types ----
export interface MFScheme {
  schemeCode: string;
  schemeName: string;
  nav: string;
  date: string;
  fundHouse: string;
  schemeType: string;
  schemeCategory: string;
}

// ---- In-memory cache for AMFI NAV data ----
let schemeCache: MFScheme[] = [];
let schemeCacheTimestamp = 0;
const SCHEME_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Fetch all NAV data from AMFI India.
 * Source: https://www.amfiindia.com/spages/NAVAll.txt
 * Format: semicolon-delimited text with headers per fund house.
 * Exported so other routers (e.g. asset-router) can reuse the cached data.
 */
export async function fetchAMFIData(): Promise<MFScheme[]> {
  const now = Date.now();
  if (schemeCache.length > 0 && now - schemeCacheTimestamp < SCHEME_CACHE_TTL) {
    return schemeCache;
  }

  try {
    const res = await fetch("https://www.amfiindia.com/spages/NAVAll.txt", {
      signal: AbortSignal.timeout(15000),
      headers: { "Accept": "text/plain" },
    });
    if (!res.ok) throw new Error(`AMFI API returned ${res.status}`);
    const text = await res.text();

    const schemes = parseAMFIText(text);
    if (schemes.length > 0) {
      schemeCache = schemes;
      schemeCacheTimestamp = now;
    }
    return schemes;
  } catch {
    // Return whatever is cached (could be stale or empty)
    return schemeCache;
  }
}

/**
 * Parse the AMFI NAV text format.
 * Structure:
 *   Fund House line (no semicolons)
 *   Header: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 *   Data lines
 *   Empty line separates categories
 */
export function parseAMFIText(text: string): MFScheme[] {
  const lines = text.split("\n");
  const schemes: MFScheme[] = [];

  let currentFundHouse = "";
  let currentSchemeType = "";
  let currentSchemeCategory = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Lines with scheme type/category markers
    if (line.startsWith("Scheme Code")) continue; // skip headers

    const parts = line.split(";");

    if (parts.length >= 5) {
      // Data line: SchemeCode;ISIN1;ISIN2;SchemeName;NAV;Date
      // or: SchemeCode;SchemeName;NAV;Date (older format)
      const schemeCode = parts[0].trim();
      if (!/^\d+$/.test(schemeCode)) continue; // Not a valid scheme code

      // Find the name (longest text field) and NAV
      let schemeName = "";
      let nav = "";
      let date = "";

      if (parts.length >= 6) {
        // Standard format: code;isin1;isin2;name;nav;date
        schemeName = parts[3].trim();
        nav = parts[4].trim();
        date = parts[5].trim();
      } else if (parts.length >= 4) {
        schemeName = parts[1].trim();
        nav = parts[2].trim();
        date = parts[3].trim();
      }

      if (schemeName && schemeCode) {
        schemes.push({
          schemeCode,
          schemeName,
          nav: nav === "N.A." ? "0" : nav,
          date,
          fundHouse: currentFundHouse,
          schemeType: currentSchemeType,
          schemeCategory: currentSchemeCategory,
        });
      }
    } else if (!line.includes(";")) {
      // Category/fund house header line
      if (
        line.includes("Open Ended") ||
        line.includes("Close Ended") ||
        line.includes("Interval Fund")
      ) {
        currentSchemeType = line;
      } else if (line.includes("Mutual Fund") || line.includes("Fund of Funds")) {
        currentFundHouse = line;
      } else {
        // Could be a subcategory
        currentSchemeCategory = line;
      }
    }
  }

  return schemes;
}

/**
 * Fetch detailed NAV history for a scheme from mfapi.in (free, no key needed).
 */
async function fetchSchemeDetails(schemeCode: string) {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`mfapi returned ${res.status}`);
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export const mfRouter = createRouter({
  /**
   * Search mutual fund schemes by name. Supports partial matching.
   * Returns top 50 matches.
   */
  search: publicQuery
    .input(
      z.object({
        query: z.string().min(2).max(200),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      const schemes = await fetchAMFIData();
      const q = input.query.toLowerCase();
      const words = q.split(/\s+/).filter((w) => w.length >= 2);

      // Score-based matching: more matched words = higher score
      const scored = schemes
        .map((s) => {
          const name = s.schemeName.toLowerCase();
          const house = s.fundHouse.toLowerCase();
          let score = 0;
          for (const word of words) {
            if (name.includes(word)) score += 2;
            if (house.includes(word)) score += 1;
          }
          // Exact substring match bonus
          if (name.includes(q)) score += 5;
          return { scheme: s, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, input.limit);

      return scored.map((s) => s.scheme);
    }),

  /**
   * Get detailed info + NAV history for a specific scheme.
   */
  details: publicQuery
    .input(z.object({ schemeCode: z.string().min(1).max(10) }))
    .query(async ({ input }) => {
      const detail = await fetchSchemeDetails(input.schemeCode);
      if (!detail) {
        return null;
      }

      // detail.meta has fund info, detail.data has NAV history
      const meta = detail.meta ?? {};
      const navHistory: Array<{ date: string; nav: string }> = (detail.data ?? []).slice(0, 365);

      // Calculate basic performance metrics from NAV history
      const latestNav = navHistory.length > 0 ? parseFloat(navHistory[0].nav) : 0;
      const performance: Record<string, number | null> = {
        "1D": calcReturn(navHistory, 1, latestNav),
        "1W": calcReturn(navHistory, 7, latestNav),
        "1M": calcReturn(navHistory, 30, latestNav),
        "3M": calcReturn(navHistory, 90, latestNav),
        "6M": calcReturn(navHistory, 180, latestNav),
        "1Y": calcReturn(navHistory, 365, latestNav),
      };

      return {
        schemeCode: input.schemeCode,
        schemeName: meta.scheme_name ?? "",
        fundHouse: meta.fund_house ?? "",
        schemeType: meta.scheme_type ?? "",
        schemeCategory: meta.scheme_category ?? "",
        latestNav,
        latestDate: navHistory[0]?.date ?? "",
        performance,
        navHistory: navHistory.slice(0, 90), // last ~3 months for chart
      };
    }),

  /**
   * Get top fund houses list.
   */
  fundHouses: publicQuery.query(async () => {
    const schemes = await fetchAMFIData();
    const houseCount = new Map<string, number>();
    for (const s of schemes) {
      if (s.fundHouse) {
        houseCount.set(s.fundHouse, (houseCount.get(s.fundHouse) ?? 0) + 1);
      }
    }
    return Array.from(houseCount.entries())
      .map(([name, count]) => ({ name, schemeCount: count }))
      .sort((a, b) => b.schemeCount - a.schemeCount)
      .slice(0, 40);
  }),
});

function calcReturn(
  navHistory: Array<{ date: string; nav: string }>,
  days: number,
  latestNav: number,
): number | null {
  if (navHistory.length < days || latestNav <= 0) return null;
  const pastNav = parseFloat(navHistory[Math.min(days, navHistory.length - 1)]?.nav ?? "0");
  if (pastNav <= 0) return null;
  return Math.round(((latestNav - pastNav) / pastNav) * 10000) / 100;
}

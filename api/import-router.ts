import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { assetHoldings } from "@db/schema";
import { eq } from "drizzle-orm";
import { enforceRateLimit, RateLimits } from "./lib/rate-limit";

/**
 * Maps common CDSL CAS / Kfintech / CAMS scheme names to our asset classes + tax treatment.
 */
export function classifyScheme(schemeName: string): {
  assetClass: "equity" | "debt" | "gold" | "real_estate" | "liquid" | "international";
  taxTreatment: "equity_ltcg" | "debt_interest" | "debt_ltcg" | "gold_ltcg" | "real_estate_ltcg" | "tax_free" | "epf_tax_deferred";
  expectedReturn: number;
  riskScore: number;
} {
  const name = schemeName.toLowerCase();

  // Gold / Gold ETFs
  if (name.includes("gold") || name.includes("goldbees")) {
    return { assetClass: "gold", taxTreatment: "gold_ltcg", expectedReturn: 8, riskScore: 5 };
  }

  // International / Global
  if (
    name.includes("international") ||
    name.includes("global") ||
    name.includes("nasdaq") ||
    name.includes("us equity") ||
    name.includes("s&p 500") ||
    name.includes("world")
  ) {
    return { assetClass: "international", taxTreatment: "debt_ltcg", expectedReturn: 11, riskScore: 7 };
  }

  // Liquid / Money Market / Overnight
  if (
    name.includes("liquid") ||
    name.includes("money market") ||
    name.includes("overnight") ||
    name.includes("ultra short")
  ) {
    return { assetClass: "liquid", taxTreatment: "debt_interest", expectedReturn: 4, riskScore: 1 };
  }

  // Debt variants
  if (
    name.includes("debt") ||
    name.includes("bond") ||
    name.includes("gilt") ||
    name.includes("income") ||
    name.includes("fixed") ||
    name.includes("short duration") ||
    name.includes("medium duration") ||
    name.includes("long duration") ||
    name.includes("corporate bond") ||
    name.includes("banking") ||
    name.includes("credit risk") ||
    name.includes("dynamic bond") ||
    name.includes("floater")
  ) {
    return { assetClass: "debt", taxTreatment: "debt_ltcg", expectedReturn: 7, riskScore: 3 };
  }

  // EPF must be checked before PPF since "employees provident fund" contains "provident fund"
  if (name.includes("epf") || name.includes("employees provident")) {
    return { assetClass: "debt", taxTreatment: "epf_tax_deferred", expectedReturn: 8.25, riskScore: 1 };
  }
  // PPF / NPS
  if (name.includes("ppf") || name.includes("provident fund")) {
    return { assetClass: "debt", taxTreatment: "tax_free", expectedReturn: 7.1, riskScore: 1 };
  }

  // Hybrid / Balanced — classify as equity
  if (
    name.includes("hybrid") ||
    name.includes("balanced") ||
    name.includes("equity savings") ||
    name.includes("aggressive hybrid") ||
    name.includes("conservative hybrid")
  ) {
    return { assetClass: "equity", taxTreatment: "equity_ltcg", expectedReturn: 10, riskScore: 5 };
  }

  // REIT / InvIT
  if (name.includes("reit") || name.includes("invit") || name.includes("infrastructure investment trust")) {
    return { assetClass: "real_estate", taxTreatment: "real_estate_ltcg", expectedReturn: 10, riskScore: 5 };
  }

  // ELSS
  if (name.includes("elss") || name.includes("tax saver") || name.includes("tax saving")) {
    return { assetClass: "equity", taxTreatment: "equity_ltcg", expectedReturn: 13, riskScore: 7 };
  }

  // Default: Equity
  return { assetClass: "equity", taxTreatment: "equity_ltcg", expectedReturn: 12, riskScore: 6 };
}

/**
 * Parse CDSL CAS-style text (copied from PDF / email statement).
 *
 * Supported formats:
 * 1) CDSL CAS tabular: lines with scheme name, folio, units, nav, value
 * 2) Simple CSV/TSV: "scheme,value,sip" or "scheme\tvalue\tsip"
 * 3) One-per-line: "Scheme Name - ₹1,23,456"
 *
 * We try all heuristics and return parsed rows.
 */
export function parseCASText(text: string): Array<{
  instrument: string;
  currentValue: number;
  monthlySip: number;
}> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: Array<{ instrument: string; currentValue: number; monthlySip: number }> = [];

  for (const line of lines) {
    // Skip obvious headers
    if (/^(scheme|fund|folio|name|instrument|asset)/i.test(line)) continue;
    if (/^[-=]+$/.test(line)) continue;

    // Strategy 1: CSV/TSV with at least 2 columns
    const csvCells = line.includes("\t") ? line.split("\t") : line.split(",");
    if (csvCells.length >= 2) {
      const name = csvCells[0].trim();
      const valuePart = csvCells.length >= 2 ? csvCells[csvCells.length === 2 ? 1 : csvCells.length - 1].trim() : "";
      const sipPart = csvCells.length >= 3 ? csvCells[2].trim() : "0";

      const value = parseIndianNumber(valuePart);
      const sip = parseIndianNumber(sipPart);

      if (name.length > 2 && value > 0) {
        results.push({ instrument: sanitizeName(name), currentValue: value, monthlySip: sip });
        continue;
      }
    }

    // Strategy 2: "Scheme Name - ₹1,23,456" or "Scheme Name  12345.67"
    const dashMatch = line.match(/^(.+?)\s*[-–—]\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/);
    if (dashMatch) {
      const value = parseIndianNumber(dashMatch[2]);
      if (value > 0) {
        results.push({ instrument: sanitizeName(dashMatch[1]), currentValue: value, monthlySip: 0 });
        continue;
      }
    }

    // Strategy 3: CAS-style — scheme name followed by numbers (units, NAV, value)
    // "SBI Bluechip Fund - Growth    1234.567   45.6789   56,345.67"
    const casMatch = line.match(/^(.+?)\s{2,}([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/);
    if (casMatch) {
      // Last number is typically market value
      const value = parseIndianNumber(casMatch[4]);
      if (value > 0) {
        results.push({ instrument: sanitizeName(casMatch[1]), currentValue: value, monthlySip: 0 });
        continue;
      }
    }

    // Strategy 4: Trailing number after a name
    const trailingMatch = line.match(/^(.{3,}?)\s+(₹?\s*[\d,]+(?:\.\d{1,2})?)\s*$/);
    if (trailingMatch) {
      const value = parseIndianNumber(trailingMatch[2]);
      if (value > 0) {
        results.push({ instrument: sanitizeName(trailingMatch[1]), currentValue: value, monthlySip: 0 });
        continue;
      }
    }
  }

  return results;
}

/** Parse Indian-formatted numbers: "1,23,456.78" → 123456.78 */
export function parseIndianNumber(s: string): number {
  const cleaned = s.replace(/[₹\s]/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

/** Sanitize scheme name: trim, limit length */
export function sanitizeName(s: string): string {
  return s.replace(/[-–—]+$/, "").trim().slice(0, 255);
}

// ---- Schema for structured CSV upload (pre-parsed on frontend) ----
const holdingRowSchema = z.object({
  instrument: z.string().min(1).max(255),
  currentValue: z.number().refine((v) => Number.isFinite(v) && v > 0, "Value must be positive"),
  monthlySip: z.number().refine((v) => Number.isFinite(v) && v >= 0, "SIP must be non-negative").default(0),
  assetClass: z
    .enum(["equity", "debt", "gold", "real_estate", "liquid", "international"])
    .optional(),
  expectedReturn: z.number().optional(),
  riskScore: z.number().optional(),
  taxTreatment: z
    .enum(["equity_ltcg", "debt_interest", "debt_ltcg", "gold_ltcg", "real_estate_ltcg", "tax_free", "epf_tax_deferred"])
    .optional(),
});

export const importRouter = createRouter({
  /**
   * Parse raw CAS text and return structured holdings preview (not yet saved).
   */
  parseCAS: authedQuery
    .input(z.object({ text: z.string().min(1).max(100_000) }))
    .mutation(async ({ input }) => {
      const parsed = parseCASText(input.text);

      // Auto-classify each holding
      return parsed.map((row) => {
        const classification = classifyScheme(row.instrument);
        return {
          instrument: row.instrument,
          currentValue: Math.round(row.currentValue * 100) / 100,
          monthlySip: Math.round(row.monthlySip * 100) / 100,
          ...classification,
        };
      });
    }),

  /**
   * Bulk import holdings. Accepts pre-classified rows (from parseCAS preview + user edits).
   * Inserts all in a transaction. Rate limited.
   */
  bulkImport: authedQuery
    .input(
      z.object({
        holdings: z.array(holdingRowSchema).min(1).max(500),
        replaceExisting: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit(ctx, "mutation", RateLimits.mutation);
      const db = getDb();

      await db.transaction(async (tx) => {
        if (input.replaceExisting) {
          await tx.delete(assetHoldings).where(
            eq(assetHoldings.userId, ctx.user.id),
          );
        }

        for (const row of input.holdings) {
          const classification = classifyScheme(row.instrument);
          await tx.insert(assetHoldings).values({
            userId: ctx.user.id,
            assetClass: row.assetClass ?? classification.assetClass,
            instrument: row.instrument,
            currentValue: String(row.currentValue),
            monthlySip: String(row.monthlySip),
            expectedReturn: String(row.expectedReturn ?? classification.expectedReturn),
            riskScore: String(row.riskScore ?? classification.riskScore),
            taxTreatment: row.taxTreatment ?? classification.taxTreatment,
          });
        }
      });

      return { success: true, imported: input.holdings.length };
    }),
});

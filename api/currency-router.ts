import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";

// ---- Hardcoded base rates (INR per 1 unit of foreign currency) ----
// These serve as fallback when the API is unreachable.
const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 91.2,
  GBP: 106.0,
  AED: 22.7,
  SGD: 63.0,
  CAD: 62.0,
  AUD: 55.5,
  JPY: 0.56,
  CHF: 95.0,
  CNY: 11.5,
  HKD: 10.7,
  SAR: 22.3,
  KWD: 272.0,
  QAR: 22.9,
  BHD: 221.0,
  OMR: 217.0,
  MYR: 19.5,
  THB: 2.4,
  NZD: 51.5,
};

const CURRENCY_META: Record<string, { name: string; symbol: string; flag: string }> = {
  INR: { name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  USD: { name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  EUR: { name: "Euro", symbol: "€", flag: "🇪🇺" },
  GBP: { name: "British Pound", symbol: "£", flag: "🇬🇧" },
  AED: { name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  SGD: { name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
  CAD: { name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
  AUD: { name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  JPY: { name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  CHF: { name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  CNY: { name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰" },
  SAR: { name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦" },
  KWD: { name: "Kuwaiti Dinar", symbol: "د.ك", flag: "🇰🇼" },
  QAR: { name: "Qatari Riyal", symbol: "﷼", flag: "🇶🇦" },
  BHD: { name: "Bahraini Dinar", symbol: "BD", flag: "🇧🇭" },
  OMR: { name: "Omani Rial", symbol: "﷼", flag: "🇴🇲" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾" },
  THB: { name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿" },
};

// ---- In-memory cache for exchange rates ----
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch latest INR-based exchange rates from a free public API.
 * Falls back to hardcoded rates if API is unavailable.
 */
async function getINRRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }

  try {
    // Free API: https://open.er-api.com/v6/latest/INR (no key needed)
    const res = await fetch("https://open.er-api.com/v6/latest/INR", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();

    if (data?.result === "success" && data.rates) {
      // data.rates are "1 INR = X foreign", we want "1 foreign = X INR"
      const inrRates: Record<string, number> = { INR: 1 };
      for (const [code, rate] of Object.entries(data.rates)) {
        const numRate = Number(rate);
        if (numRate > 0 && code in CURRENCY_META) {
          inrRates[code] = 1 / numRate; // invert: 1 foreign = X INR
        }
      }
      cachedRates = inrRates;
      cacheTimestamp = now;
      return inrRates;
    }
    throw new Error("Invalid API response");
  } catch {
    // Return fallback rates
    cachedRates = FALLBACK_RATES;
    cacheTimestamp = now;
    return FALLBACK_RATES;
  }
}

export const currencyRouter = createRouter({
  /**
   * List all supported currencies with metadata.
   */
  list: publicQuery.query(() => {
    return Object.entries(CURRENCY_META).map(([code, meta]) => ({
      code,
      ...meta,
    }));
  }),

  /**
   * Get current exchange rates (all currencies relative to INR).
   * Returns { rates: Record<code, inrPerUnit>, updatedAt }
   */
  rates: publicQuery.query(async () => {
    const rates = await getINRRates();
    return {
      base: "INR",
      rates,
      updatedAt: new Date(cacheTimestamp).toISOString(),
    };
  }),

  /**
   * Convert an amount between two currencies.
   */
  convert: publicQuery
    .input(
      z.object({
        amount: z.number().refine((v) => Number.isFinite(v) && v >= 0, "Amount must be non-negative"),
        from: z.string().length(3),
        to: z.string().length(3),
      }),
    )
    .query(async ({ input }) => {
      const rates = await getINRRates();
      const fromRate = rates[input.from.toUpperCase()];
      const toRate = rates[input.to.toUpperCase()];

      if (!fromRate || !toRate) {
        return { error: "Unsupported currency", converted: 0, rate: 0 };
      }

      // Convert via INR: from -> INR -> to
      const inrAmount = input.amount * fromRate;
      const converted = inrAmount / toRate;
      const rate = fromRate / toRate;

      return {
        from: input.from.toUpperCase(),
        to: input.to.toUpperCase(),
        amount: input.amount,
        converted: Math.round(converted * 100) / 100,
        rate: Math.round(rate * 10000) / 10000,
        inrEquivalent: Math.round(inrAmount * 100) / 100,
      };
    }),
});

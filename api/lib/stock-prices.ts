/**
 * Live market price lookups for exchange-traded holdings (stocks, ETFs).
 * Uses Yahoo Finance's public chart/search endpoints — no API key required.
 * NSE symbols use the ".NS" suffix (e.g. RELIANCE.NS), BSE ".BO", US stocks bare (AAPL).
 */

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number | null;
  currency: string;
  exchange: string;
  asOf: string; // ISO timestamp of the quote
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Parse a Yahoo v8 chart response into a quote. Returns null when unusable. */
export function parseChartResponse(json: unknown, symbol: string): StockQuote | null {
  if (typeof json !== "object" || json === null) return null;
  const root = json as Record<string, unknown>;
  const chart = root.chart as Record<string, unknown> | undefined;
  if (!chart || chart.error) return null;

  const results = chart.result as Array<Record<string, unknown>> | undefined;
  const meta = results?.[0]?.meta as Record<string, unknown> | undefined;
  if (!meta) return null;

  const price = Number(meta.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) return null;

  const prev = Number(meta.previousClose ?? meta.chartPreviousClose);
  const time = Number(meta.regularMarketTime);

  return {
    symbol: String(meta.symbol ?? symbol),
    name: String(meta.longName ?? meta.shortName ?? meta.symbol ?? symbol),
    price,
    previousClose: Number.isFinite(prev) && prev > 0 ? prev : null,
    currency: String(meta.currency ?? "INR"),
    exchange: String(meta.fullExchangeName ?? meta.exchangeName ?? ""),
    asOf: Number.isFinite(time) && time > 0 ? new Date(time * 1000).toISOString() : new Date().toISOString(),
  };
}

/** Parse a Yahoo v1 search response into symbol suggestions. */
export function parseSearchResponse(json: unknown): SymbolSearchResult[] {
  if (typeof json !== "object" || json === null) return [];
  const quotes = (json as Record<string, unknown>).quotes as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(quotes)) return [];

  const KEEP_TYPES = new Set(["EQUITY", "ETF", "MUTUALFUND", "INDEX"]);

  return quotes
    .filter((q) => {
      const type = String(q.quoteType ?? "");
      return typeof q.symbol === "string" && KEEP_TYPES.has(type);
    })
    .map((q) => ({
      symbol: String(q.symbol),
      name: String(q.longname ?? q.shortname ?? q.symbol),
      exchange: String(q.exchDisp ?? q.exchange ?? ""),
      quoteType: String(q.quoteType),
    }));
}

/** Convert a price in `currency` to INR given a map of INR-per-unit rates. */
export function convertToINR(
  price: number,
  currency: string,
  inrRates: Record<string, number>,
): number | null {
  const rate = inrRates[currency.toUpperCase()];
  if (!rate || rate <= 0) return null;
  return price * rate;
}

/** Fetch a live quote for a single ticker. Returns null on any failure. */
export async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return parseChartResponse(await res.json(), symbol);
  } catch {
    return null;
  }
}

/** Search tickers by name/symbol. Returns [] on any failure. */
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return [];
    return parseSearchResponse(await res.json());
  } catch {
    return [];
  }
}

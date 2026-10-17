import { describe, it, expect } from "vitest";
import { parseChartResponse, parseSearchResponse, convertToINR } from "./stock-prices";

describe("parseChartResponse", () => {
  const validResponse = {
    chart: {
      result: [
        {
          meta: {
            symbol: "RELIANCE.NS",
            longName: "Reliance Industries Limited",
            regularMarketPrice: 2456.75,
            previousClose: 2430.1,
            currency: "INR",
            fullExchangeName: "NSE",
            regularMarketTime: 1760682600,
          },
        },
      ],
      error: null,
    },
  };

  it("parses a valid chart response", () => {
    const quote = parseChartResponse(validResponse, "RELIANCE.NS");
    expect(quote).not.toBeNull();
    expect(quote!.symbol).toBe("RELIANCE.NS");
    expect(quote!.name).toBe("Reliance Industries Limited");
    expect(quote!.price).toBe(2456.75);
    expect(quote!.previousClose).toBe(2430.1);
    expect(quote!.currency).toBe("INR");
    expect(quote!.exchange).toBe("NSE");
    expect(new Date(quote!.asOf).getTime()).toBe(1760682600 * 1000);
  });

  it("returns null when the API reports an error", () => {
    expect(
      parseChartResponse({ chart: { result: null, error: { code: "Not Found" } } }, "BAD"),
    ).toBeNull();
  });

  it("returns null for a missing or invalid price", () => {
    const noPrice = { chart: { result: [{ meta: { symbol: "X" } }], error: null } };
    expect(parseChartResponse(noPrice, "X")).toBeNull();

    const zeroPrice = { chart: { result: [{ meta: { symbol: "X", regularMarketPrice: 0 } }], error: null } };
    expect(parseChartResponse(zeroPrice, "X")).toBeNull();
  });

  it("tolerates missing previousClose and timestamp", () => {
    const quote = parseChartResponse(
      { chart: { result: [{ meta: { symbol: "AAPL", regularMarketPrice: 190.5, currency: "USD" } }], error: null } },
      "AAPL",
    );
    expect(quote).not.toBeNull();
    expect(quote!.previousClose).toBeNull();
    expect(quote!.currency).toBe("USD");
    // Falls back to now — still a parseable ISO date
    expect(Number.isNaN(new Date(quote!.asOf).getTime())).toBe(false);
  });

  it("returns null for malformed payloads", () => {
    expect(parseChartResponse(null, "X")).toBeNull();
    expect(parseChartResponse("nope", "X")).toBeNull();
    expect(parseChartResponse({}, "X")).toBeNull();
  });
});

describe("parseSearchResponse", () => {
  it("keeps only equities, ETFs, mutual funds and indexes", () => {
    const results = parseSearchResponse({
      quotes: [
        { symbol: "RELIANCE.NS", quoteType: "EQUITY", longname: "Reliance Industries", exchDisp: "NSE" },
        { symbol: "GOLDBEES.NS", quoteType: "ETF", shortname: "Gold BeES", exchDisp: "NSE" },
        { symbol: "RELIANCE.NS", quoteType: "OPTION", longname: "Reliance option" },
        { symbol: "USDINR=X", quoteType: "CURRENCY" },
      ],
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      symbol: "RELIANCE.NS",
      name: "Reliance Industries",
      exchange: "NSE",
      quoteType: "EQUITY",
    });
    expect(results[1].name).toBe("Gold BeES");
  });

  it("returns an empty array for malformed payloads", () => {
    expect(parseSearchResponse(null)).toEqual([]);
    expect(parseSearchResponse({})).toEqual([]);
    expect(parseSearchResponse({ quotes: "nope" })).toEqual([]);
  });
});

describe("convertToINR", () => {
  const rates = { INR: 1, USD: 83.5, EUR: 91.2 };

  it("converts using INR-per-unit rates", () => {
    expect(convertToINR(100, "USD", rates)).toBe(8350);
    expect(convertToINR(50, "EUR", rates)).toBe(4560);
    expect(convertToINR(250, "INR", rates)).toBe(250);
  });

  it("is case-insensitive on the currency code", () => {
    expect(convertToINR(10, "usd", rates)).toBe(835);
  });

  it("returns null for unknown currencies", () => {
    expect(convertToINR(100, "BTC", rates)).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { computeSnapshotTotals, shouldRefreshValuations } from "./networth-router";

describe("shouldRefreshValuations", () => {
  it("refreshes when the user has never refreshed", () => {
    expect(shouldRefreshValuations(undefined, 1_000_000)).toBe(true);
  });

  it("skips refresh within the throttle window", () => {
    const now = 1_000_000;
    expect(shouldRefreshValuations(now - 5 * 60 * 1000, now)).toBe(false);
  });

  it("refreshes once the throttle window has elapsed", () => {
    const now = 1_000_000;
    expect(shouldRefreshValuations(now - 15 * 60 * 1000, now)).toBe(true);
    expect(shouldRefreshValuations(now - 16 * 60 * 1000, now)).toBe(true);
  });
});

describe("computeSnapshotTotals", () => {
  it("sums holdings by asset class when holdings exist", () => {
    const result = computeSnapshotTotals(
      [
        { assetClass: "equity", currentValue: "100000" },
        { assetClass: "equity", currentValue: "50000" },
        { assetClass: "debt", currentValue: "25000" },
      ],
      { totalAssets: "999999", totalLiabilities: "20000" },
    );

    expect(result.source).toBe("holdings");
    expect(result.totalAssets).toBe(175000);
    expect(result.breakdown).toEqual({ equity: 150000, debt: 25000 });
    expect(result.totalLiabilities).toBe(20000);
    expect(result.netWorth).toBe(155000);
  });

  it("falls back to financial profile totals when there are no holdings", () => {
    const result = computeSnapshotTotals([], {
      totalAssets: "500000",
      totalLiabilities: "100000",
    });

    expect(result.source).toBe("profile");
    expect(result.totalAssets).toBe(500000);
    expect(result.breakdown).toEqual({});
    expect(result.netWorth).toBe(400000);
  });

  it("falls back to the profile when holdings only contain zero-value rows", () => {
    const result = computeSnapshotTotals(
      [{ assetClass: "equity", currentValue: "0" }],
      { totalAssets: "300000", totalLiabilities: "0" },
    );

    expect(result.source).toBe("profile");
    expect(result.totalAssets).toBe(300000);
    expect(result.netWorth).toBe(300000);
  });

  it("handles a missing financial profile gracefully", () => {
    const result = computeSnapshotTotals(
      [{ assetClass: "gold", currentValue: "80000" }],
      null,
    );

    expect(result.source).toBe("holdings");
    expect(result.totalLiabilities).toBe(0);
    expect(result.netWorth).toBe(80000);
  });

  it("can produce a negative net worth when liabilities exceed assets", () => {
    const result = computeSnapshotTotals([], {
      totalAssets: "100000",
      totalLiabilities: "250000",
    });

    expect(result.netWorth).toBe(-150000);
  });
});

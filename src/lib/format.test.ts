import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatCurrency,
  formatCompact,
  formatPercent,
  parseFormattedNumber,
  formatCompactWithFull,
} from "./format";

describe("formatNumber", () => {
  it("formats integers with Indian locale separators", () => {
    expect(formatNumber(100000)).toBe("1,00,000");
    expect(formatNumber(10000000)).toBe("1,00,00,000");
  });

  it("formats small numbers without separators", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("handles string input", () => {
    expect(formatNumber("100000")).toBe("1,00,000");
  });

  it("returns '0' for null/undefined/empty", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
    expect(formatNumber("")).toBe("0");
  });

  it("returns '0' for NaN strings", () => {
    expect(formatNumber("abc")).toBe("0");
  });

  it("handles negative numbers", () => {
    const result = formatNumber(-100000);
    expect(result).toContain("1,00,000");
    expect(result).toContain("-");
  });
});

describe("formatCurrency", () => {
  it("prefixes with ₹ symbol", () => {
    expect(formatCurrency(100000)).toBe("₹1,00,000");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });

  it("handles null/undefined", () => {
    expect(formatCurrency(null)).toBe("₹0");
    expect(formatCurrency(undefined)).toBe("₹0");
  });
});

describe("formatCompact", () => {
  it("formats crores", () => {
    expect(formatCompact(10000000)).toBe("₹1.0Cr");
    expect(formatCompact(50000000)).toBe("₹5.0Cr");
  });

  it("formats lakhs", () => {
    expect(formatCompact(100000)).toBe("₹1.0L");
    expect(formatCompact(500000)).toBe("₹5.0L");
  });

  it("formats thousands", () => {
    expect(formatCompact(1000)).toBe("₹1.0K");
    expect(formatCompact(5000)).toBe("₹5.0K");
  });

  it("formats small numbers without suffix", () => {
    expect(formatCompact(500)).toBe("₹500");
  });

  it("handles zero", () => {
    expect(formatCompact(0)).toBe("₹0");
  });

  it("handles null/undefined", () => {
    expect(formatCompact(null)).toBe("₹0");
    expect(formatCompact(undefined)).toBe("₹0");
  });

  it("handles negative crore values", () => {
    const result = formatCompact(-20000000);
    expect(result).toBe("₹-2.0Cr");
  });

  it("handles string input", () => {
    expect(formatCompact("10000000")).toBe("₹1.0Cr");
  });
});

describe("formatCompactWithFull", () => {
  it("returns both display and full format", () => {
    const result = formatCompactWithFull(10000000);
    expect(result.display).toBe("₹1.0Cr");
    expect(result.full).toBe("₹1,00,00,000");
  });
});

describe("formatPercent", () => {
  it("formats with one decimal and % suffix", () => {
    expect(formatPercent(12.5)).toBe("12.5%");
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("handles string input", () => {
    expect(formatPercent("8.75")).toBe("8.8%");
  });

  it("returns '0%' for null/undefined", () => {
    expect(formatPercent(null)).toBe("0%");
    expect(formatPercent(undefined)).toBe("0%");
  });

  it("returns '0%' for NaN strings", () => {
    expect(formatPercent("abc")).toBe("0%");
  });
});

describe("parseFormattedNumber", () => {
  it("parses Indian-formatted currency string", () => {
    expect(parseFormattedNumber("₹1,00,000")).toBe(100000);
    expect(parseFormattedNumber("₹1,00,00,000")).toBe(10000000);
  });

  it("parses plain comma-separated numbers", () => {
    expect(parseFormattedNumber("1,000")).toBe(1000);
    expect(parseFormattedNumber("10,000")).toBe(10000);
  });

  it("parses numbers without formatting", () => {
    expect(parseFormattedNumber("12345")).toBe(12345);
  });

  it("handles decimal values", () => {
    expect(parseFormattedNumber("1,234.56")).toBe(1234.56);
  });
});

import { describe, it, expect } from "vitest";
import {
  classifyScheme,
  parseCASText,
  parseIndianNumber,
  sanitizeName,
} from "./import-router";

describe("classifyScheme", () => {
  it("classifies gold funds", () => {
    const result = classifyScheme("SBI Gold Fund - Growth");
    expect(result.assetClass).toBe("gold");
    expect(result.taxTreatment).toBe("gold_ltcg");
  });

  it("classifies GoldBees ETF", () => {
    const result = classifyScheme("Nippon India ETF Gold BeES");
    expect(result.assetClass).toBe("gold");
  });

  it("classifies international/global funds", () => {
    expect(classifyScheme("Motilal Oswal Nasdaq 100 Fund").assetClass).toBe("international");
    expect(classifyScheme("Parag Parikh Global Fund").assetClass).toBe("international");
    expect(classifyScheme("ICICI S&P 500 Index Fund").assetClass).toBe("international");
    expect(classifyScheme("Franklin US Equity Fund").assetClass).toBe("international");
  });

  it("classifies liquid/money market funds", () => {
    expect(classifyScheme("HDFC Liquid Fund - Growth").assetClass).toBe("liquid");
    expect(classifyScheme("SBI Money Market Fund").assetClass).toBe("liquid");
    expect(classifyScheme("ICICI Overnight Fund").assetClass).toBe("liquid");
    expect(classifyScheme("Axis Ultra Short Term Fund").assetClass).toBe("liquid");
  });

  it("classifies debt funds", () => {
    expect(classifyScheme("HDFC Short Duration Fund").assetClass).toBe("debt");
    expect(classifyScheme("SBI Corporate Bond Fund").assetClass).toBe("debt");
    expect(classifyScheme("ICICI Banking & PSU Debt Fund").assetClass).toBe("debt");
    expect(classifyScheme("Nippon Dynamic Bond Fund").assetClass).toBe("debt");
    expect(classifyScheme("HDFC Gilt Fund").assetClass).toBe("debt");
    expect(classifyScheme("Axis Credit Risk Fund").assetClass).toBe("debt");
  });

  it("classifies PPF as tax-free debt", () => {
    const result = classifyScheme("PPF Account");
    expect(result.assetClass).toBe("debt");
    expect(result.taxTreatment).toBe("tax_free");
  });

  it("classifies EPF as tax-deferred debt", () => {
    const result = classifyScheme("Employees Provident Fund");
    expect(result.assetClass).toBe("debt");
    expect(result.taxTreatment).toBe("epf_tax_deferred");
  });

  it("classifies hybrid/balanced funds as equity", () => {
    expect(classifyScheme("ICICI Balanced Advantage Fund").assetClass).toBe("equity");
    expect(classifyScheme("HDFC Aggressive Hybrid Fund").assetClass).toBe("equity");
  });

  it("classifies REIT/InvIT as real_estate", () => {
    expect(classifyScheme("Embassy REIT Fund").assetClass).toBe("real_estate");
    expect(classifyScheme("India InvIT Fund").assetClass).toBe("real_estate");
  });

  it("classifies ELSS as equity with expected returns", () => {
    const result = classifyScheme("Axis ELSS Tax Saver Fund");
    expect(result.assetClass).toBe("equity");
    expect(result.expectedReturn).toBe(13);
    expect(result.riskScore).toBe(7);
  });

  it("defaults to equity for generic fund names", () => {
    const result = classifyScheme("Mirae Asset Large Cap Fund - Growth");
    expect(result.assetClass).toBe("equity");
    expect(result.taxTreatment).toBe("equity_ltcg");
    expect(result.expectedReturn).toBe(12);
  });

  it("is case-insensitive", () => {
    expect(classifyScheme("GOLD ETF FUND").assetClass).toBe("gold");
    expect(classifyScheme("liquid FUND").assetClass).toBe("liquid");
  });
});

describe("parseIndianNumber", () => {
  it("parses standard Indian-formatted numbers", () => {
    expect(parseIndianNumber("1,23,456.78")).toBe(123456.78);
  });

  it("parses numbers with ₹ symbol", () => {
    expect(parseIndianNumber("₹1,00,000")).toBe(100000);
  });

  it("parses plain numbers", () => {
    expect(parseIndianNumber("12345")).toBe(12345);
  });

  it("returns 0 for invalid input", () => {
    expect(parseIndianNumber("abc")).toBe(0);
    expect(parseIndianNumber("")).toBe(0);
  });

  it("returns 0 for negative numbers", () => {
    expect(parseIndianNumber("-100")).toBe(0);
  });

  it("strips whitespace", () => {
    expect(parseIndianNumber(" ₹ 1,000 ")).toBe(1000);
  });
});

describe("sanitizeName", () => {
  it("trims whitespace", () => {
    expect(sanitizeName("  SBI Fund  ")).toBe("SBI Fund");
  });

  it("removes trailing dashes and trims", () => {
    expect(sanitizeName("SBI Fund—")).toBe("SBI Fund");
    expect(sanitizeName("SBI Fund–")).toBe("SBI Fund");
    // "SBI Fund -" → regex removes trailing "-" → "SBI Fund " → trim → "SBI Fund"
    expect(sanitizeName("SBI Fund -")).toBe("SBI Fund");
  });

  it("limits length to 255 characters", () => {
    const long = "A".repeat(300);
    expect(sanitizeName(long).length).toBe(255);
  });
});

describe("parseCASText", () => {
  it("parses CSV format (last column is value for 3+ cols)", () => {
    // Parser takes last column as value, 3rd column as SIP
    const text = `SBI Bluechip Fund,500000,10000
HDFC Liquid Fund,200000,5000`;
    const result = parseCASText(text);
    expect(result).toHaveLength(2);
    expect(result[0].instrument).toBe("SBI Bluechip Fund");
    expect(result[0].currentValue).toBe(10000);
    expect(result[0].monthlySip).toBe(10000);
  });

  it("parses TSV format (last column is value for 3+ cols)", () => {
    const text = `ICICI Value Fund\t300000\t5000`;
    const result = parseCASText(text);
    expect(result).toHaveLength(1);
    expect(result[0].instrument).toBe("ICICI Value Fund");
    expect(result[0].currentValue).toBe(5000);
    expect(result[0].monthlySip).toBe(5000);
  });

  it("parses dash-separated format", () => {
    const text = `SBI Gold Fund - ₹1,50,000
Axis ELSS Fund - ₹2,00,000`;
    const result = parseCASText(text);
    expect(result).toHaveLength(2);
    expect(result[0].instrument).toBe("SBI Gold Fund");
    expect(result[0].currentValue).toBe(150000);
    expect(result[1].currentValue).toBe(200000);
  });

  it("parses CAS tabular format with spaces", () => {
    const text = `Mirae Asset Large Cap    1234.567   89.1234   1,10,000.00`;
    const result = parseCASText(text);
    expect(result).toHaveLength(1);
    expect(result[0].instrument).toBe("Mirae Asset Large Cap");
    expect(result[0].currentValue).toBe(110000);
  });

  it("skips header lines", () => {
    const text = `Scheme Name,Value,SIP
My Good Fund,100000,5000`;
    const result = parseCASText(text);
    // "Scheme Name" matches header regex, "My Good Fund" is parsed
    expect(result).toHaveLength(1);
    expect(result[0].instrument).toBe("My Good Fund");
  });

  it("skips separator lines", () => {
    const text = `--------
SBI Fund,0,100000
========`;
    // Separators skipped, and "SBI Fund" has value 100000 (last col)
    const result = parseCASText(text);
    expect(result).toHaveLength(1);
    expect(result[0].currentValue).toBe(100000);
  });

  it("handles empty input", () => {
    expect(parseCASText("")).toHaveLength(0);
    expect(parseCASText("   \n\n  ")).toHaveLength(0);
  });

  it("handles trailing number format", () => {
    const text = `HDFC Mid-Cap Opportunities Fund  ₹3,50,000`;
    const result = parseCASText(text);
    expect(result).toHaveLength(1);
    expect(result[0].currentValue).toBe(350000);
  });

  it("handles mixed formats", () => {
    const text = `SBI Fund,200000,5000
HDFC Fund - ₹1,00,000
Axis Fund  50000`;
    const result = parseCASText(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

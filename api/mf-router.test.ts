import { describe, it, expect } from "vitest";
import { parseAMFIText } from "./mf-router";

describe("parseAMFIText", () => {
  it("parses standard 6-column AMFI format", () => {
    const text = `Aditya Birla Sun Life Mutual Fund
Open Ended Schemes(Debt Scheme - Banking and PSU Fund)
Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;INF209KA12Z1;INF209KA13Z9;Aditya Birla Sun Life Banking & PSU Debt Fund  - DIRECT - IDCW;228.1234;06-May-2026
119552;INF209KB12Z2;-;Aditya Birla Sun Life Banking & PSU Debt Fund  - Regular - Growth;345.6789;06-May-2026`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(2);

    expect(result[0].schemeCode).toBe("119551");
    expect(result[0].schemeName).toBe(
      "Aditya Birla Sun Life Banking & PSU Debt Fund  - DIRECT - IDCW",
    );
    expect(result[0].nav).toBe("228.1234");
    expect(result[0].date).toBe("06-May-2026");
    expect(result[0].fundHouse).toBe("Aditya Birla Sun Life Mutual Fund");
    expect(result[0].schemeType).toContain("Open Ended");

    expect(result[1].schemeCode).toBe("119552");
    expect(result[1].nav).toBe("345.6789");
  });

  it("handles N.A. NAV as '0'", () => {
    const text = `Test Mutual Fund
100001;INF001;-;Some NFO Scheme;N.A.;06-May-2026`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(1);
    expect(result[0].nav).toBe("0");
  });

  it("skips lines that are not valid scheme data", () => {
    const text = `Some Random Text
Another Random Text
Scheme Code;ISIN;ISIN;Name;NAV;Date
Not a valid scheme line`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(parseAMFIText("")).toHaveLength(0);
  });

  it("identifies fund house from lines containing 'Mutual Fund'", () => {
    const text = `SBI Mutual Fund
200001;INF001;-;SBI Bluechip Fund Growth;56.7890;06-May-2026`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(1);
    expect(result[0].fundHouse).toBe("SBI Mutual Fund");
  });

  it("handles multiple fund houses", () => {
    const text = `SBI Mutual Fund
100001;INF001;-;SBI Equity Fund;100.00;01-Jan-2026

HDFC Mutual Fund
200001;INF002;-;HDFC Equity Fund;200.00;01-Jan-2026`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(2);
    expect(result[0].fundHouse).toBe("SBI Mutual Fund");
    expect(result[1].fundHouse).toBe("HDFC Mutual Fund");
  });

  it("rejects lines where scheme code is not numeric", () => {
    const text = `ABC;INF001;-;Not a real scheme;100.00;01-Jan-2026`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(0);
  });

  it("requires at least 5 semicolons (4-column not supported)", () => {
    // The parser outer check needs parts.length >= 5
    const text = `Test Mutual Fund
300001;Some Old Scheme;45.6789;01-Jan-2026`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(0);
  });

  it("parses 5-column format", () => {
    const text = `Test Mutual Fund
300001;INF001;Some Old Scheme;45.6789;01-Jan-2026`;

    const result = parseAMFIText(text);
    expect(result).toHaveLength(1);
    expect(result[0].schemeName).toBe("INF001");
    expect(result[0].nav).toBe("Some Old Scheme");
  });
});

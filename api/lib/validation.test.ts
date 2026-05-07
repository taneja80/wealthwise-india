import { describe, it, expect } from "vitest";
import { safeDecimal, strongPassword } from "./validation";

describe("safeDecimal", () => {
  it("accepts a finite number", () => {
    const schema = safeDecimal();
    expect(schema.parse(42)).toBe(42);
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(-10.5)).toBe(-10.5);
  });

  it("rejects NaN", () => {
    const schema = safeDecimal();
    expect(() => schema.parse(NaN)).toThrow();
  });

  it("rejects Infinity", () => {
    const schema = safeDecimal();
    expect(() => schema.parse(Infinity)).toThrow();
    expect(() => schema.parse(-Infinity)).toThrow();
  });

  it("enforces min constraint", () => {
    const schema = safeDecimal({ min: 0 });
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(100)).toBe(100);
    expect(() => schema.parse(-1)).toThrow("at least 0");
  });

  it("enforces max constraint", () => {
    const schema = safeDecimal({ max: 100 });
    expect(schema.parse(100)).toBe(100);
    expect(schema.parse(50)).toBe(50);
    expect(() => schema.parse(101)).toThrow("at most 100");
  });

  it("enforces both min and max", () => {
    const schema = safeDecimal({ min: 0, max: 100 });
    expect(schema.parse(50)).toBe(50);
    expect(() => schema.parse(-1)).toThrow("at least 0");
    expect(() => schema.parse(200)).toThrow("at most 100");
  });
});

describe("strongPassword", () => {
  it("accepts a valid strong password", () => {
    expect(strongPassword.parse("Abcdef1!")).toBe("Abcdef1!");
    expect(strongPassword.parse("MyP@ssw0rd")).toBe("MyP@ssw0rd");
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(() => strongPassword.parse("Ab1!")).toThrow("at least 8");
  });

  it("rejects passwords longer than 100 characters", () => {
    const long = "A1!" + "a".repeat(100);
    expect(() => strongPassword.parse(long)).toThrow("at most 100");
  });

  it("rejects passwords without uppercase", () => {
    expect(() => strongPassword.parse("abcdef1!")).toThrow("uppercase");
  });

  it("rejects passwords without lowercase", () => {
    expect(() => strongPassword.parse("ABCDEF1!")).toThrow("lowercase");
  });

  it("rejects passwords without digit", () => {
    expect(() => strongPassword.parse("Abcdefg!")).toThrow("digit");
  });

  it("rejects passwords without special character", () => {
    expect(() => strongPassword.parse("Abcdefg1")).toThrow("special");
  });
});

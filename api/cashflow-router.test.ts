import { describe, it, expect } from "vitest";
import { calculateCashFlows } from "./cashflow-router";

type TestGoal = {
  id: number;
  targetAmount: number;
  currentAmount: number;
  timelineYears: number;
  monthlyContribution: number;
  expectedReturn: number;
  name: string;
};

function makeGoal(overrides: Partial<TestGoal> = {}): TestGoal {
  return {
    id: 1,
    targetAmount: 1_000_000,
    currentAmount: 0,
    timelineYears: 10,
    monthlyContribution: 10_000,
    expectedReturn: 8,
    name: "House",
    ...overrides,
  };
}

describe("calculateCashFlows goal contributions", () => {
  it("keys contributions by goal id so same-named goals do not overwrite each other", () => {
    const goalList = [
      makeGoal({ id: 1, name: "House", monthlyContribution: 10_000 }),
      makeGoal({ id: 2, name: "House", monthlyContribution: 5_000 }),
    ];

    const projections = calculateCashFlows(
      30,
      200_000,
      80_000,
      1_000_000,
      0,
      1,
      "moderate",
      goalList,
      60,
    );

    const contributions = projections[0].goalContributions;
    expect(Object.keys(contributions).sort()).toEqual(["1", "2"]);
    expect(contributions["1"]).toBe(120_000);
    expect(contributions["2"]).toBe(60_000);

    // Savings must reflect BOTH contributions: 2.4M income - 0.96M expenses - 180k goals
    expect(projections[0].savings).toBe(2_400_000 - 960_000 - 180_000);
  });

  it("omits goals whose timeline has ended", () => {
    const goalList = [
      makeGoal({ id: 1, timelineYears: 1 }),
      makeGoal({ id: 2, timelineYears: 3 }),
    ];

    const projections = calculateCashFlows(
      30,
      200_000,
      80_000,
      1_000_000,
      0,
      3,
      "moderate",
      goalList,
      60,
    );

    expect(projections).toHaveLength(3);
    expect(Object.keys(projections[0].goalContributions).sort()).toEqual(["1", "2"]);
    expect(Object.keys(projections[1].goalContributions)).toEqual(["2"]);
    expect(Object.keys(projections[2].goalContributions)).toEqual(["2"]);
  });

  it("produces an empty contribution map when there are no goals", () => {
    const projections = calculateCashFlows(
      30,
      200_000,
      80_000,
      1_000_000,
      0,
      1,
      "moderate",
      [],
      60,
    );

    expect(projections[0].goalContributions).toEqual({});
  });
});

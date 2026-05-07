import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { goals, assetHoldings, financialProfiles } from "@db/schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

const LIQUID_ASSET_CLASSES = ["equity", "debt", "liquid", "international"] as const;
const ILLIQUID_ASSET_CLASSES = ["real_estate", "gold"] as const;

/** Future value of a lump sum: PV * (1+r)^n */
function futureValueLumpSum(pv: number, annualRate: number, years: number): number {
  if (annualRate <= 0) return pv;
  return pv * Math.pow(1 + annualRate / 100, years);
}

/** Future value of monthly SIP (annuity due): PMT * [((1+r)^n - 1) / r] * (1+r) */
function futureValueSIP(monthly: number, annualRate: number, years: number): number {
  if (monthly <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r <= 0) return monthly * years * 12;
  const n = years * 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

/** Required monthly SIP to reach a target given current savings */
function requiredMonthlySIP(
  target: number,
  currentAmount: number,
  annualRate: number,
  years: number,
): number {
  const fvCurrent = futureValueLumpSum(currentAmount, annualRate, years);
  const gap = target - fvCurrent;
  if (gap <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r <= 0) return gap / (years * 12);
  const n = years * 12;
  // Solve for PMT in FV = PMT * [((1+r)^n - 1)/r] * (1+r)
  const factor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return gap / factor;
}

type TrackingStatus = "ahead" | "on_track" | "behind" | "at_risk";

function computeStatus(projected: number, target: number): TrackingStatus {
  const ratio = target > 0 ? projected / target : 1;
  if (ratio >= 1.1) return "ahead";
  if (ratio >= 0.9) return "on_track";
  if (ratio >= 0.6) return "behind";
  return "at_risk";
}

export const goalsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.goals.findMany({
      where: eq(goals.userId, ctx.user.id),
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });
  }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        category: z.enum([
          "retirement",
          "education",
          "home",
          "vehicle",
          "wedding",
          "travel",
          "emergency",
          "wealth",
          "other",
        ]),
        targetAmount: safeDecimal({ min: 0 }),
        currentAmount: safeDecimal({ min: 0 }).default(0),
        timelineYears: z.number().int().min(1).max(50),
        priority: z.enum(["high", "medium", "low"]).default("medium"),
        description: z.string().optional(),
        monthlyContribution: safeDecimal({ min: 0 }).default(0),
        expectedReturn: safeDecimal({ min: 0, max: 100 }).default(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(goals).values({
        name: input.name,
        category: input.category,
        targetAmount: String(input.targetAmount),
        currentAmount: String(input.currentAmount),
        timelineYears: input.timelineYears,
        priority: input.priority,
        description: input.description,
        monthlyContribution: String(input.monthlyContribution),
        expectedReturn: String(input.expectedReturn),
        userId: ctx.user.id,
      });
      return { success: true, id: Number((result as any).insertId) };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        category: z.enum([
          "retirement",
          "education",
          "home",
          "vehicle",
          "wedding",
          "travel",
          "emergency",
          "wealth",
          "other",
        ]).optional(),
        targetAmount: safeDecimal({ min: 0 }).optional(),
        currentAmount: safeDecimal({ min: 0 }).optional(),
        timelineYears: z.number().int().min(1).max(50).optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        description: z.string().optional(),
        monthlyContribution: safeDecimal({ min: 0 }).optional(),
        expectedReturn: safeDecimal({ min: 0, max: 100 }).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...rawData } = input;
      const data: Record<string, any> = { updatedAt: new Date() };
      if (rawData.name !== undefined) data.name = rawData.name;
      if (rawData.category !== undefined) data.category = rawData.category;
      if (rawData.targetAmount !== undefined) data.targetAmount = String(rawData.targetAmount);
      if (rawData.currentAmount !== undefined) data.currentAmount = String(rawData.currentAmount);
      if (rawData.timelineYears !== undefined) data.timelineYears = rawData.timelineYears;
      if (rawData.priority !== undefined) data.priority = rawData.priority;
      if (rawData.description !== undefined) data.description = rawData.description;
      if (rawData.monthlyContribution !== undefined) data.monthlyContribution = String(rawData.monthlyContribution);
      if (rawData.expectedReturn !== undefined) data.expectedReturn = String(rawData.expectedReturn);
      await db
        .update(goals)
        .set(data)
        .where(and(eq(goals.id, id), eq(goals.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(goals)
        .where(and(eq(goals.id, input.id), eq(goals.userId, ctx.user.id)));
      return { success: true };
    }),

  trackProgress: authedQuery
    .input(
      z.object({
        includeIlliquid: z.boolean().default(false),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const includeIlliquid = input?.includeIlliquid ?? false;

      const [userGoals, holdings, fProfile] = await Promise.all([
        db.query.goals.findMany({
          where: eq(goals.userId, ctx.user.id),
          orderBy: (goals, { desc }) => [desc(goals.createdAt)],
        }),
        db.query.assetHoldings.findMany({
          where: eq(assetHoldings.userId, ctx.user.id),
        }),
        db.query.financialProfiles.findFirst({
          where: eq(financialProfiles.userId, ctx.user.id),
        }),
      ]);

      // Categorize assets
      const liquidAssets = holdings.filter((h) =>
        (LIQUID_ASSET_CLASSES as readonly string[]).includes(h.assetClass),
      );
      const illiquidAssets = holdings.filter((h) =>
        (ILLIQUID_ASSET_CLASSES as readonly string[]).includes(h.assetClass),
      );

      const totalLiquid = liquidAssets.reduce(
        (sum, a) => sum + Number(a.currentValue),
        0,
      );
      const totalIlliquid = illiquidAssets.reduce(
        (sum, a) => sum + Number(a.currentValue),
        0,
      );
      const totalMonthlySIPFromHoldings = liquidAssets.reduce(
        (sum, a) => sum + Number(a.monthlySip || 0),
        0,
      );

      const availableCorpus = includeIlliquid
        ? totalLiquid + totalIlliquid
        : totalLiquid;

      // Track each goal
      // Default inflation: 6% for general, 10% for education
      const DEFAULT_INFLATION = 0.06;
      const EDUCATION_INFLATION = 0.10;

      const goalTracking = userGoals.map((goal) => {
        const target = Number(goal.targetAmount);
        const current = Number(goal.currentAmount);
        const monthly = Number(goal.monthlyContribution);
        const rate = Number(goal.expectedReturn);
        const years = goal.timelineYears;

        // Inflation-adjust the target so users see what they actually need in future rupees
        const inflationRate = goal.category === "education" ? EDUCATION_INFLATION : DEFAULT_INFLATION;
        const inflationAdjustedTarget = Math.round(target * Math.pow(1 + inflationRate, years));

        const projectedValue =
          futureValueLumpSum(current, rate, years) +
          futureValueSIP(monthly, rate, years);

        const requiredSIP = requiredMonthlySIP(inflationAdjustedTarget, current, rate, years);
        const sipGap = requiredSIP - monthly;
        const status = computeStatus(projectedValue, inflationAdjustedTarget);
        const shortfall = inflationAdjustedTarget - projectedValue;

        // How much of the illiquid assets would close the gap if sold
        const illiquidCanCover =
          shortfall > 0 ? Math.min(totalIlliquid, shortfall) : 0;
        const gapAfterIlliquid = Math.max(shortfall - totalIlliquid, 0);

        return {
          goalId: goal.id,
          goalName: goal.name,
          category: goal.category,
          priority: goal.priority,
          targetAmount: target,
          inflationAdjustedTarget,
          currentAmount: current,
          monthlyContribution: monthly,
          expectedReturn: rate,
          timelineYears: years,
          projectedValue: Math.round(projectedValue),
          requiredMonthlySIP: Math.round(requiredSIP),
          sipGap: Math.round(sipGap),
          status,
          shortfall: Math.round(Math.max(shortfall, 0)),
          surplus: Math.round(Math.max(-shortfall, 0)),
          illiquidCanCover: Math.round(illiquidCanCover),
          gapAfterIlliquid: Math.round(gapAfterIlliquid),
        };
      });

      // Aggregate summaries
      const totalTarget = goalTracking.reduce((s, g) => s + g.inflationAdjustedTarget, 0);
      const totalProjected = goalTracking.reduce(
        (s, g) => s + g.projectedValue,
        0,
      );
      const totalShortfall = goalTracking.reduce(
        (s, g) => s + g.shortfall,
        0,
      );
      const totalRequiredSIP = goalTracking.reduce(
        (s, g) => s + g.requiredMonthlySIP,
        0,
      );
      const totalCurrentSIP = goalTracking.reduce(
        (s, g) => s + g.monthlyContribution,
        0,
      );

      const overallStatus: TrackingStatus =
        totalProjected >= totalTarget * 1.1
          ? "ahead"
          : totalProjected >= totalTarget * 0.9
            ? "on_track"
            : totalProjected >= totalTarget * 0.6
              ? "behind"
              : "at_risk";

      // Emergency fund adequacy (should cover 6-12 months of expenses)
      const monthlyExpenses = fProfile ? Number(fProfile.monthlyExpenses) : 0;
      const emergencyFundRecommended = monthlyExpenses * 6;
      const emergencyFundIdeal = monthlyExpenses * 12;
      const liquidCash = liquidAssets
        .filter((a) => a.assetClass === "liquid")
        .reduce((s, a) => s + Number(a.currentValue), 0);
      const emergencyGoalAmount = goalTracking
        .filter((g) => g.category === "emergency")
        .reduce((s, g) => s + g.currentAmount, 0);
      const effectiveEmergencyFund = liquidCash + emergencyGoalAmount;
      const emergencyFundStatus: "adequate" | "low" | "none" =
        effectiveEmergencyFund >= emergencyFundRecommended
          ? "adequate"
          : effectiveEmergencyFund > 0
            ? "low"
            : "none";

      return {
        goals: goalTracking,
        summary: {
          totalLiquidAssets: Math.round(totalLiquid),
          totalIlliquidAssets: Math.round(totalIlliquid),
          totalMonthlySIPFromHoldings: Math.round(totalMonthlySIPFromHoldings),
          availableCorpus: Math.round(availableCorpus),
          totalGoalTarget: Math.round(totalTarget),
          totalProjectedValue: Math.round(totalProjected),
          totalShortfall: Math.round(totalShortfall),
          totalRequiredSIP: Math.round(totalRequiredSIP),
          totalCurrentSIP: Math.round(totalCurrentSIP),
          sipGap: Math.round(totalRequiredSIP - totalCurrentSIP),
          overallStatus,
          includeIlliquid,
          illiquidBreakdown: {
            gold: Math.round(
              illiquidAssets
                .filter((a) => a.assetClass === "gold")
                .reduce((s, a) => s + Number(a.currentValue), 0),
            ),
            realEstate: Math.round(
              illiquidAssets
                .filter((a) => a.assetClass === "real_estate")
                .reduce((s, a) => s + Number(a.currentValue), 0),
            ),
          },
          emergencyFund: {
            current: Math.round(effectiveEmergencyFund),
            recommended: Math.round(emergencyFundRecommended),
            ideal: Math.round(emergencyFundIdeal),
            status: emergencyFundStatus,
            monthlyExpenses: Math.round(monthlyExpenses),
          },
        },
      };
    }),
});

import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { taxProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

// Indian tax slabs FY 2025-26 (Old Regime)
const OLD_REGIME_SLABS = [
  { limit: 250000, rate: 0 },
  { limit: 500000, rate: 0.05 },
  { limit: 1000000, rate: 0.20 },
  { limit: Infinity, rate: 0.30 },
];

// Indian tax slabs FY 2025-26 (New Regime) — Union Budget 2025
const NEW_REGIME_SLABS = [
  { limit: 400000, rate: 0 },
  { limit: 800000, rate: 0.05 },
  { limit: 1200000, rate: 0.10 },
  { limit: 1600000, rate: 0.15 },
  { limit: 2000000, rate: 0.20 },
  { limit: 2400000, rate: 0.25 },
  { limit: Infinity, rate: 0.30 },
];

// Section 87A rebate: no tax if taxable income ≤ ₹12L (new regime)
const NEW_REGIME_REBATE_LIMIT = 1200000;
// Old regime rebate: no tax if taxable income ≤ ₹5L
const OLD_REGIME_REBATE_LIMIT = 500000;

function calculateTax(income: number, slabs: typeof OLD_REGIME_SLABS): number {
  let tax = 0;
  let remaining = income;
  let prevLimit = 0;
  for (const slab of slabs) {
    const taxableInSlab = Math.min(Math.max(remaining, 0), slab.limit - prevLimit);
    tax += taxableInSlab * slab.rate;
    remaining -= taxableInSlab;
    prevLimit = slab.limit;
    if (remaining <= 0) break;
  }
  // Health & Education Cess @ 4%
  tax *= 1.04;
  return tax;
}

function calculateOldRegimeDeductions(profile: typeof taxProfiles.$inferSelect): number {
  return Math.min(Number(profile.section80c), 150000) +
    Math.min(Number(profile.section80dSelf), 25000) +
    Math.min(Number(profile.section80dParents), profile.parentsSeniorCitizen ? 50000 : 25000) +
    Math.min(Number(profile.section80ccd1b), 50000) +
    Math.min(Number(profile.section24b), 200000) +
    Number(profile.section80e) +
    Number(profile.section80g) +
    Number(profile.hraExemption) +
    (profile.ltaClaimed ? 25000 : 0);
}

function calculateOldRegimeTaxableIncome(
  annualIncome: number,
  deductions: number,
  profile: typeof taxProfiles.$inferSelect,
): number {
  const standardDeduction = 50000;
  // NPS employer contribution (80CCD(2)) is separate - up to 10% of salary
  const npsEmployerDeduction = profile.hasNps ? Math.min(annualIncome * 0.10, 75000) : 0;
  const taxable = annualIncome - standardDeduction - deductions - npsEmployerDeduction;
  return Math.max(taxable, 0);
}

function calculateNewRegimeTaxableIncome(annualIncome: number): number {
  const standardDeduction = 75000; // Updated: ₹75K standard deduction in new regime (Budget 2024)
  return Math.max(annualIncome - standardDeduction, 0);
}

function applyRebate(tax: number, taxableIncome: number, rebateLimit: number): number {
  // Section 87A: if taxable income is within rebate limit, tax is nil
  if (taxableIncome <= rebateLimit) return 0;
  return tax;
}

/** Determine marginal slab rate for a given taxable income */
function getMarginalRate(taxableIncome: number, slabs: typeof OLD_REGIME_SLABS): number {
  let prevLimit = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.limit) return slab.rate;
    prevLimit = slab.limit;
  }
  return slabs[slabs.length - 1].rate;
}

export const taxRouter = createRouter({
  getProfile: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.taxProfiles.findFirst({
      where: eq(taxProfiles.userId, ctx.user.id),
    }) ?? null;
  }),

  saveProfile: authedQuery
    .input(
      z.object({
        regime: z.enum(["old", "new"]).default("old"),
        section80c: safeDecimal({ min: 0 }).default(0),
        section80dSelf: safeDecimal({ min: 0 }).default(0),
        section80dParents: safeDecimal({ min: 0 }).default(0),
        section80ccd1b: safeDecimal({ min: 0 }).default(0),
        section24b: safeDecimal({ min: 0 }).default(0),
        section80e: safeDecimal({ min: 0 }).default(0),
        section80g: safeDecimal({ min: 0 }).default(0),
        hraExemption: safeDecimal({ min: 0 }).default(0),
        ltaClaimed: z.boolean().default(false),
        hasNps: z.boolean().default(false),
        hasPpf: z.boolean().default(false),
        hasEpf: z.boolean().default(false),
        hasHealthInsurance: z.boolean().default(false),
        parentsSeniorCitizen: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.taxProfiles.findFirst({
        where: eq(taxProfiles.userId, ctx.user.id),
      });
      const data: Record<string, any> = {
        regime: input.regime,
        section80c: String(input.section80c),
        section80dSelf: String(input.section80dSelf),
        section80dParents: String(input.section80dParents),
        section80ccd1b: String(input.section80ccd1b),
        section24b: String(input.section24b),
        section80e: String(input.section80e),
        section80g: String(input.section80g),
        hraExemption: String(input.hraExemption),
        ltaClaimed: input.ltaClaimed,
        hasNps: input.hasNps,
        hasPpf: input.hasPpf,
        hasEpf: input.hasEpf,
        hasHealthInsurance: input.hasHealthInsurance,
        parentsSeniorCitizen: input.parentsSeniorCitizen,
      };
      if (existing) {
        await db.update(taxProfiles).set({ ...data, updatedAt: new Date() }).where(eq(taxProfiles.userId, ctx.user.id));
      } else {
        await db.insert(taxProfiles).values({ ...data, userId: ctx.user.id });
      }
      return { success: true };
    }),

  calculate: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const profile = await db.query.taxProfiles.findFirst({
      where: eq(taxProfiles.userId, ctx.user.id),
    });
    const { financialProfiles } = await import("@db/schema");
    const fProfile = await db.query.financialProfiles.findFirst({
      where: eq(financialProfiles.userId, ctx.user.id),
    });

    if (!fProfile) return null;

    const annualIncome = Number(fProfile.monthlyIncome) * 12;
    const taxProfile = profile ?? {
      regime: "old" as const,
      section80c: "0", section80dSelf: "0", section80dParents: "0",
      section80ccd1b: "0", section24b: "0", section80e: "0",
      section80g: "0", hraExemption: "0", ltaClaimed: false,
      hasNps: false, hasPpf: false, hasEpf: false,
      hasHealthInsurance: false, parentsSeniorCitizen: false,
    };

    const deductions = calculateOldRegimeDeductions(taxProfile as any);

    const oldRegimeTaxable = calculateOldRegimeTaxableIncome(annualIncome, deductions, taxProfile as any);
    const oldRegimeTaxRaw = calculateTax(oldRegimeTaxable, OLD_REGIME_SLABS);
    const oldRegimeTax = applyRebate(oldRegimeTaxRaw, oldRegimeTaxable, OLD_REGIME_REBATE_LIMIT);

    const newRegimeTaxable = calculateNewRegimeTaxableIncome(annualIncome);
    const newRegimeTaxRaw = calculateTax(newRegimeTaxable, NEW_REGIME_SLABS);
    const newRegimeTax = applyRebate(newRegimeTaxRaw, newRegimeTaxable, NEW_REGIME_REBATE_LIMIT);

    const oldRegimeEffectiveRate = annualIncome > 0 ? (oldRegimeTax / annualIncome) * 100 : 0;
    const newRegimeEffectiveRate = annualIncome > 0 ? (newRegimeTax / annualIncome) * 100 : 0;

    // Tax optimization suggestions
    const suggestions: string[] = [];
    const unused80c = Math.max(150000 - Number(taxProfile.section80c), 0);
    if (unused80c > 0) {
      // Use actual marginal rate instead of assuming 30%
      const marginalRate = getMarginalRate(oldRegimeTaxable, OLD_REGIME_SLABS);
      const potentialSaving = Math.round(unused80c * marginalRate * 1.04);
      if (potentialSaving > 0) {
        suggestions.push(`You can save up to ₹${potentialSaving.toLocaleString("en-IN")} more tax by investing ₹${unused80c.toLocaleString("en-IN")} in 80C instruments (ELSS, PPF, NPS)`);
      }
    }
    if (!taxProfile.hasNps) {
      suggestions.push("Start NPS (National Pension System) to get additional ₹50,000 deduction under Section 80CCD(1B)");
    }
    if (!taxProfile.hasHealthInsurance) {
      suggestions.push("Get health insurance to claim Section 80D deduction up to ₹25,000 (₹50,000 for senior citizen parents)");
    }
    if (Number(taxProfile.section80dParents) === 0 && taxProfile.parentsSeniorCitizen) {
      suggestions.push("Your parents are senior citizens - you can claim up to ₹50,000 for their health insurance under 80D");
    }
    if (oldRegimeTax > newRegimeTax) {
      suggestions.push("New tax regime gives you lower tax liability. Consider switching if you cannot maximize deductions.");
    } else {
      suggestions.push("Old tax regime is better for you. Continue maximizing deductions to save more tax.");
    }

    return {
      annualIncome,
      oldRegime: {
        taxableIncome: oldRegimeTaxable,
        deductions,
        taxPayable: Math.round(oldRegimeTax),
        effectiveRate: oldRegimeEffectiveRate.toFixed(2),
      },
      newRegime: {
        taxableIncome: newRegimeTaxable,
        deductions: 75000, // standard deduction (₹75K from Budget 2024)
        taxPayable: Math.round(newRegimeTax),
        effectiveRate: newRegimeEffectiveRate.toFixed(2),
      },
      savingsPotential: Math.round(Math.abs(oldRegimeTax - newRegimeTax)),
      recommendedRegime: oldRegimeTax <= newRegimeTax ? "old" : "new" as const,
      unused80c,
      suggestions,
    };
  }),
});

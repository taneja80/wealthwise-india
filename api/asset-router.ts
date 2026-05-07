import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { assetHoldings, assetProjections, financialProfiles, userProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

// Asset class parameters for CAPM/Mean-Variance Optimization
// Returns are post-tax, inflation-adjusted real returns
const ASSET_PARAMS: Record<string, {
  name: string;
  expectedReturn: number;
  volatility: number; // standard deviation
  taxEfficiency: number; // 0-1, higher = more tax efficient
  correlation: Record<string, number>;
}> = {
  equity: {
    name: "Equity / Mutual Funds",
    expectedReturn: 0.12,
    volatility: 0.18,
    taxEfficiency: 0.85, // LTCG @ 10% above 1L
    correlation: { debt: 0.1, gold: 0.15, real_estate: 0.3, liquid: 0.0, international: 0.65 },
  },
  debt: {
    name: "Debt / FD / PPF / Bonds",
    expectedReturn: 0.07,
    volatility: 0.04,
    taxEfficiency: 0.60, // interest taxed at slab
    correlation: { equity: 0.1, gold: 0.05, real_estate: 0.1, liquid: 0.3, international: 0.05 },
  },
  gold: {
    name: "Gold / Gold ETFs",
    expectedReturn: 0.08,
    volatility: 0.14,
    taxEfficiency: 0.70, // LTCG after 3 years with indexation
    correlation: { equity: 0.15, debt: 0.05, real_estate: 0.2, liquid: 0.0, international: 0.1 },
  },
  real_estate: {
    name: "Real Estate / REITs",
    expectedReturn: 0.10,
    volatility: 0.12,
    taxEfficiency: 0.75, // LTCG with indexation benefits
    correlation: { equity: 0.3, debt: 0.1, gold: 0.2, liquid: 0.0, international: 0.25 },
  },
  liquid: {
    name: "Liquid / Savings",
    expectedReturn: 0.04,
    volatility: 0.005,
    taxEfficiency: 0.50, // taxed as interest
    correlation: { equity: 0.0, debt: 0.3, gold: 0.0, real_estate: 0.0, international: 0.0 },
  },
  international: {
    name: "International Equity",
    expectedReturn: 0.11,
    volatility: 0.19,
    taxEfficiency: 0.80, // taxed as debt fund (slab rate)
    correlation: { equity: 0.65, debt: 0.05, gold: 0.1, real_estate: 0.25, liquid: 0.0 },
  },
};

// Sharpe ratio based optimal allocation using mean-variance framework
function meanVarianceOptimization(
  assetClasses: string[],
  riskTolerance: "low" | "medium" | "high",
): Record<string, number> {
  // Risk-free rate (approximate for India)
  const rf = 0.065;

  // Target volatility based on risk tolerance
  const targetVol = riskTolerance === "low" ? 0.08 : riskTolerance === "medium" ? 0.14 : 0.22;

  // Simplified: use inverse-volatility weighted allocation adjusted for returns
  let totalWeight = 0;
  const weights: Record<string, number> = {};

  for (const ac of assetClasses) {
    const params = ASSET_PARAMS[ac];
    if (!params) continue;
    const excessReturn = params.expectedReturn - rf;
    const sharpe = excessReturn / params.volatility;
    // Weight proportional to Sharpe ratio, inversely proportional to volatility
    const rawWeight = Math.max(sharpe, 0.05) / params.volatility;
    weights[ac] = rawWeight;
    totalWeight += rawWeight;
  }

  // Normalize
  for (const ac of assetClasses) {
    weights[ac] = totalWeight > 0 ? weights[ac] / totalWeight : 1 / assetClasses.length;
  }

  // Adjust toward target volatility using iterative approach
  const portfolioVol = calculatePortfolioVolatility(weights, assetClasses);
  if (portfolioVol > 0) {
    const scale = targetVol / portfolioVol;
    const clampedScale = Math.min(scale, 2.5); // cap leverage
    if (clampedScale < 1) {
      // Reduce risky assets, increase safe
      for (const ac of assetClasses) {
        const riskFactor = ASSET_PARAMS[ac].volatility / 0.15; // normalized
        weights[ac] *= (1 - (riskFactor - 0.5) * (1 - clampedScale) * 0.5);
      }
    }
  }

  // Re-normalize
  const sum = Object.values(weights).reduce((s, v) => s + v, 0);
  for (const ac of assetClasses) {
    weights[ac] = sum > 0 ? weights[ac] / sum : 1 / assetClasses.length;
  }

  // Ensure minimum allocations for diversification
  const minAlloc = 0.03;
  for (const ac of assetClasses) {
    if (weights[ac] < minAlloc && weights[ac] > 0) {
      weights[ac] = minAlloc;
    }
  }

  // Final normalization
  const finalSum = Object.values(weights).reduce((s, v) => s + v, 0);
  for (const ac of assetClasses) {
    weights[ac] = finalSum > 0 ? weights[ac] / finalSum : 1 / assetClasses.length;
  }

  return weights;
}

function calculatePortfolioVolatility(weights: Record<string, number>, assetClasses: string[]): number {
  let variance = 0;
  for (const i of assetClasses) {
    for (const j of assetClasses) {
      const wi = weights[i] ?? 0;
      const wj = weights[j] ?? 0;
      const vi = ASSET_PARAMS[i]?.volatility ?? 0;
      const vj = ASSET_PARAMS[j]?.volatility ?? 0;
      const corr = i === j ? 1 : (ASSET_PARAMS[i]?.correlation[j] ?? 0.1);
      variance += wi * wj * vi * vj * corr;
    }
  }
  return Math.sqrt(variance);
}

function calculatePortfolioReturn(weights: Record<string, number>, assetClasses: string[]): number {
  let totalReturn = 0;
  for (const ac of assetClasses) {
    totalReturn += (weights[ac] ?? 0) * (ASSET_PARAMS[ac]?.expectedReturn ?? 0);
  }
  return totalReturn;
}

// Efficient frontier points for visualization
function generateEfficientFrontier(assetClasses: string[]) {
  const rf = 0.065;
  const points = [];

  // Try different risk tolerance levels
  const riskLevels = ["low", "medium", "high"] as const;
  for (const risk of riskLevels) {
    const weights = meanVarianceOptimization(assetClasses, risk);
    const ret = calculatePortfolioReturn(weights, assetClasses);
    const vol = calculatePortfolioVolatility(weights, assetClasses);
    const sharpe = vol > 0 ? (ret - rf) / vol : 0;
    points.push({ risk, return: ret, volatility: vol, sharpe, weights });
  }

  return points;
}

export const assetRouter = createRouter({
  listHoldings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.assetHoldings.findMany({
      where: eq(assetHoldings.userId, ctx.user.id),
      orderBy: (assetHoldings, { desc }) => [desc(assetHoldings.createdAt)],
    });
  }),

  createHolding: authedQuery
    .input(
      z.object({
        assetClass: z.enum(["equity", "debt", "gold", "real_estate", "liquid", "international"]),
        instrument: z.string().min(1).max(255),
        currentValue: safeDecimal({ min: 0 }),
        monthlySip: safeDecimal({ min: 0 }).default(0),
        expectedReturn: safeDecimal({ min: 0, max: 100 }),
        riskScore: safeDecimal({ min: 1, max: 10 }).default(5),
        taxTreatment: z.enum([
          "equity_ltcg", "debt_interest", "debt_ltcg", "gold_ltcg",
          "real_estate_ltcg", "tax_free", "epf_tax_deferred",
        ]).default("equity_ltcg"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(assetHoldings).values({
        userId: ctx.user.id,
        assetClass: input.assetClass,
        instrument: input.instrument,
        currentValue: String(input.currentValue),
        monthlySip: String(input.monthlySip),
        expectedReturn: String(input.expectedReturn),
        riskScore: String(input.riskScore),
        taxTreatment: input.taxTreatment,
      });
      return { success: true };
    }),

  deleteHolding: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(assetHoldings).where(eq(assetHoldings.id, input.id));
      return { success: true };
    }),

  getEfficientFrontier: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const holdings = await db.query.assetHoldings.findMany({
      where: eq(assetHoldings.userId, ctx.user.id),
    });

    // Use holdings' asset classes or default set
    const assetClasses = holdings.length > 0
      ? [...new Set(holdings.map(h => h.assetClass))]
      : ["equity", "debt", "gold", "liquid"];

    const frontier = generateEfficientFrontier(assetClasses);

    return frontier.map(p => ({
      risk: p.risk,
      return: Math.round(p.return * 10000) / 100, // as percentage
      volatility: Math.round(p.volatility * 10000) / 100, // as percentage
      sharpe: Math.round(p.sharpe * 100) / 100,
      weights: Object.fromEntries(
        Object.entries(p.weights).map(([k, v]) => [k, Math.round(v * 100)])
      ),
    }));
  }),

  // Project each asset class forward
  projectByAssetClass: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const holdings = await db.query.assetHoldings.findMany({
      where: eq(assetHoldings.userId, ctx.user.id),
    });
    const uProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    });
    const fProfile = await db.query.financialProfiles.findFirst({
      where: eq(financialProfiles.userId, ctx.user.id),
    });

    if (!uProfile || !fProfile) return null;

    const horizon = fProfile.planningHorizon ?? 30;
    const age = uProfile.age;

    // Aggregate holdings by asset class
    const byAssetClass: Record<string, {
      currentValue: number;
      monthlySip: number;
      expectedReturn: number;
      instruments: string[];
    }> = {};

    for (const h of holdings) {
      const ac = h.assetClass;
      if (!byAssetClass[ac]) {
        byAssetClass[ac] = { currentValue: 0, monthlySip: 0, expectedReturn: 0, instruments: [] };
      }
      byAssetClass[ac].currentValue += Number(h.currentValue);
      byAssetClass[ac].monthlySip += Number(h.monthlySip);
      byAssetClass[ac].expectedReturn = Math.max(byAssetClass[ac].expectedReturn, Number(h.expectedReturn));
      byAssetClass[ac].instruments.push(h.instrument);
    }

    // Add defaults from financial profile if no holdings
    if (!byAssetClass["equity"] && Number(fProfile.equityInvestments) > 0) {
      byAssetClass["equity"] = {
        currentValue: Number(fProfile.equityInvestments),
        monthlySip: 0,
        expectedReturn: 12,
        instruments: ["Equity Investments"],
      };
    }
    if (!byAssetClass["debt"] && Number(fProfile.debtInvestments) > 0) {
      byAssetClass["debt"] = {
        currentValue: Number(fProfile.debtInvestments),
        monthlySip: 0,
        expectedReturn: 7,
        instruments: ["Debt Investments"],
      };
    }
    if (!byAssetClass["gold"] && Number(fProfile.gold) > 0) {
      byAssetClass["gold"] = {
        currentValue: Number(fProfile.gold),
        monthlySip: 0,
        expectedReturn: 8,
        instruments: ["Gold"],
      };
    }
    if (!byAssetClass["real_estate"] && Number(fProfile.realEstate) > 0) {
      byAssetClass["real_estate"] = {
        currentValue: Number(fProfile.realEstate),
        monthlySip: 0,
        expectedReturn: 10,
        instruments: ["Real Estate"],
      };
    }

    // Project each asset class
    const projections: Array<{
      year: number;
      age: number;
      assetClass: string;
      assetName: string;
      projectedValue: number;
      contributions: number;
      returns: number;
      expectedReturn: number;
    }> = [];

    for (const [ac, data] of Object.entries(byAssetClass)) {
      let value = data.currentValue;
      let totalContributions = data.currentValue;
      const annualReturn = data.expectedReturn / 100;
      const monthlySip = data.monthlySip;

      for (let year = 1; year <= horizon; year++) {
        const yearlyContribution = monthlySip * 12;
        value = (value + yearlyContribution) * (1 + annualReturn);
        totalContributions += yearlyContribution;

        projections.push({
          year,
          age: age + year,
          assetClass: ac,
          assetName: ASSET_PARAMS[ac]?.name ?? ac,
          projectedValue: Math.round(value),
          contributions: Math.round(totalContributions),
          returns: Math.round(value - totalContributions),
          expectedReturn: data.expectedReturn,
        });
      }
    }

    // Also calculate optimal allocation using CAPM/Efficient Frontier
    const allAssetClasses = Object.keys(byAssetClass);
    const riskTolerance = age < 35 ? "high" : age < 50 ? "medium" : "low";
    const optimalWeights = meanVarianceOptimization(allAssetClasses, riskTolerance);
    const portfolioReturn = calculatePortfolioReturn(optimalWeights, allAssetClasses);
    const portfolioVol = calculatePortfolioVolatility(optimalWeights, allAssetClasses);

    // Persist projections into the assetProjections table
    await db.transaction(async (tx) => {
      await tx.delete(assetProjections).where(eq(assetProjections.userId, ctx.user.id));
      for (const p of projections) {
        await tx.insert(assetProjections).values({
          userId: ctx.user.id,
          year: p.year,
          assetClass: p.assetClass as any,
          projectedValue: String(p.projectedValue),
          contributions: String(p.contributions),
          returns: String(p.returns),
        });
      }
    });

    // Current allocation
    const totalValue = Object.values(byAssetClass).reduce((s, d) => s + d.currentValue, 0);
    const currentWeights: Record<string, number> = {};
    for (const [ac, data] of Object.entries(byAssetClass)) {
      currentWeights[ac] = totalValue > 0 ? data.currentValue / totalValue : 0;
    }

    return {
      assetClasses: allAssetClasses.map(ac => ({
        class: ac,
        name: ASSET_PARAMS[ac]?.name ?? ac,
        currentValue: byAssetClass[ac]?.currentValue ?? 0,
        monthlySip: byAssetClass[ac]?.monthlySip ?? 0,
        expectedReturn: byAssetClass[ac]?.expectedReturn ?? 0,
        volatility: Math.round((ASSET_PARAMS[ac]?.volatility ?? 0.1) * 100),
        taxEfficiency: Math.round((ASSET_PARAMS[ac]?.taxEfficiency ?? 0.5) * 100),
        currentWeight: Math.round((currentWeights[ac] ?? 0) * 100),
        optimalWeight: Math.round((optimalWeights[ac] ?? 0) * 100),
        instruments: byAssetClass[ac]?.instruments ?? [],
      })),
      projections,
      optimalPortfolio: {
        expectedReturn: Math.round(portfolioReturn * 10000) / 100,
        volatility: Math.round(portfolioVol * 10000) / 100,
        sharpeRatio: Math.round(((portfolioReturn - 0.065) / portfolioVol) * 100) / 100,
        riskTolerance,
        weights: Object.fromEntries(
          Object.entries(optimalWeights).map(([k, v]) => [k, Math.round(v * 100)])
        ),
      },
    };
  }),
});

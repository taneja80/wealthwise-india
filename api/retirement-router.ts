import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { retirementModels, userProfiles, financialProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

export const retirementRouter = createRouter({
  getModel: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.retirementModels.findFirst({
      where: eq(retirementModels.userId, ctx.user.id),
    }) ?? null;
  }),

  saveModel: authedQuery
    .input(
      z.object({
        retirementAge: z.number().int().min(40).max(75).default(60),
        currentMonthlyExpense: safeDecimal({ min: 0 }),
        postRetirementExpensePercent: z.number().int().min(30).max(120).default(70),
        healthcareInflation: safeDecimal({ min: 5, max: 20 }).default(10),
        lifestyleInflation: safeDecimal({ min: 3, max: 15 }).default(6),
        lifeExpectancy: z.number().int().min(60).max(100).default(85),
        desiredCorpus: safeDecimal({ min: 0 }).default(0),
        monthlyPension: safeDecimal({ min: 0 }).default(0),
        rentalIncomePostRetirement: safeDecimal({ min: 0 }).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.retirementModels.findFirst({
        where: eq(retirementModels.userId, ctx.user.id),
      });
      const data: Record<string, string | number | boolean | Date | null | undefined> = {
        retirementAge: input.retirementAge,
        currentMonthlyExpense: String(input.currentMonthlyExpense),
        postRetirementExpensePercent: input.postRetirementExpensePercent,
        healthcareInflation: String(input.healthcareInflation),
        lifestyleInflation: String(input.lifestyleInflation),
        lifeExpectancy: input.lifeExpectancy,
        desiredCorpus: String(input.desiredCorpus),
        monthlyPension: String(input.monthlyPension),
        rentalIncomePostRetirement: String(input.rentalIncomePostRetirement),
      };
      if (existing) {
        await db.update(retirementModels).set({ ...data, updatedAt: new Date() }).where(eq(retirementModels.userId, ctx.user.id));
      } else {
        await db.insert(retirementModels).values({ ...data, userId: ctx.user.id });
      }
      return { success: true };
    }),

  calculate: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const model = await db.query.retirementModels.findFirst({
      where: eq(retirementModels.userId, ctx.user.id),
    });
    const uProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    });
    const fProfile = await db.query.financialProfiles.findFirst({
      where: eq(financialProfiles.userId, ctx.user.id),
    });

    if (!uProfile || !fProfile) return null;

    const age = uProfile.age;
    const modelData = model ?? {
      retirementAge: 60,
      currentMonthlyExpense: fProfile.monthlyExpenses ?? "0",
      postRetirementExpensePercent: 70,
      healthcareInflation: "10.00",
      lifestyleInflation: "6.00",
      lifeExpectancy: 85,
      desiredCorpus: "0",
      monthlyPension: "0",
      rentalIncomePostRetirement: "0",
    };

    const retirementAge = modelData.retirementAge ?? 60;
    const yearsToRetirement = retirementAge - age;
    const yearsInRetirement = (modelData.lifeExpectancy ?? 85) - retirementAge;
    const currentMonthlyExpense = Number(modelData.currentMonthlyExpense);
    const expensePercent = (modelData.postRetirementExpensePercent ?? 70) / 100;
    const healthcareInflation = Number(modelData.healthcareInflation) / 100;
    const lifestyleInflation = Number(modelData.lifestyleInflation) / 100;
    const monthlyPension = Number(modelData.monthlyPension);
    const monthlyRental = Number(modelData.rentalIncomePostRetirement);
    const portfolioReturn = 0.08; // post-retirement conservative return

    // Build pre-retirement projections
    const preRetirementYears = [];
    for (let y = 1; y <= yearsToRetirement; y++) {
      const futureAge = age + y;
      const inflatedExpense = currentMonthlyExpense * Math.pow(1 + lifestyleInflation, y);
      const annualExpense = inflatedExpense * 12;
      const income = Number(fProfile.monthlyIncome) * 12 * Math.pow(1.05, y);
      const savings = income - annualExpense;
      preRetirementYears.push({
        year: y,
        age: futureAge,
        phase: "pre-retirement" as const,
        annualIncome: Math.round(income),
        annualExpense: Math.round(annualExpense),
        monthlyExpense: Math.round(inflatedExpense),
        annualSavings: Math.round(savings),
      });
    }

    // Build post-retirement projections
    const postRetirementYears = [];
    const firstRetirementYearExpense = currentMonthlyExpense * Math.pow(1 + lifestyleInflation, yearsToRetirement) * expensePercent;
    for (let y = 1; y <= yearsInRetirement; y++) {
      const yearFromNow = yearsToRetirement + y;
      const futureAge = age + yearFromNow;
      // Healthcare costs rise faster in retirement
      const healthcareWeight = Math.min(y / yearsInRetirement * 0.3, 0.3); // healthcare becomes up to 30% of expenses
      const lifestyleExpense = firstRetirementYearExpense * Math.pow(1 + lifestyleInflation * 0.5, y - 1);
      const healthcareExpense = firstRetirementYearExpense * healthcareWeight * Math.pow(1 + healthcareInflation, y - 1);
      const totalMonthlyExpense = lifestyleExpense + healthcareExpense;
      const monthlyIncome = monthlyPension + monthlyRental;
      const annualShortfall = (totalMonthlyExpense - monthlyIncome) * 12;
      const corpusNeededAtYear = annualShortfall / portfolioReturn; // simplified perpetuity model
      postRetirementYears.push({
        year: yearFromNow,
        age: futureAge,
        phase: "retirement" as const,
        monthlyPension,
        monthlyRental,
        monthlyExpense: Math.round(totalMonthlyExpense),
        annualShortfall: Math.round(Math.max(annualShortfall, 0)),
        corpusNeeded: Math.round(Math.max(corpusNeededAtYear, 0)),
      });
    }

    // Calculate total retirement corpus needed (at retirement date)
    // Using the 4% rule adjusted for India (3.5% withdrawal rate)
    const finalPreRetirementMonthlyExpense = currentMonthlyExpense * Math.pow(1 + lifestyleInflation, yearsToRetirement);
    const postRetirementMonthly = finalPreRetirementMonthlyExpense * expensePercent;
    const annualPostRetirementExpense = postRetirementMonthly * 12;
    const annualIncomeSources = (monthlyPension + monthlyRental) * 12;
    const netAnnualNeed = Math.max(annualPostRetirementExpense - annualIncomeSources, 0);
    const corpusNeeded = netAnnualNeed / 0.035; // 3.5% safe withdrawal rate
    const corpusGap = Math.max(corpusNeeded - Number(fProfile.totalAssets), 0);

    // Monthly SIP needed to bridge corpus gap using proper FV-of-annuity formula
    // FV = PMT * [((1+r)^n - 1) / r] * (1+r)  where r = monthly rate
    const yearsToGoal = yearsToRetirement;
    let monthlySavingsNeeded = 0;
    if (yearsToGoal > 0 && corpusGap > 0) {
      // First, subtract future value of existing assets growing at portfolio return
      const fvExistingAssets = Number(fProfile.totalAssets) * Math.pow(1 + portfolioReturn, yearsToGoal);
      const adjustedGap = Math.max(corpusNeeded - fvExistingAssets, 0);
      if (adjustedGap > 0) {
        const monthlyRate = portfolioReturn / 12;
        const n = yearsToGoal * 12;
        const annuityFactor = ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate);
        monthlySavingsNeeded = adjustedGap / annuityFactor;
      }
    }

    return {
      summary: {
        currentAge: age,
        retirementAge,
        yearsToRetirement,
        yearsInRetirement,
        lifeExpectancy: modelData.lifeExpectancy ?? 85,
        corpusNeeded: Math.round(corpusNeeded),
        currentAssets: Number(fProfile.totalAssets),
        corpusGap: Math.round(corpusGap),
        monthlySavingsNeeded: Math.round(monthlySavingsNeeded),
        monthlyPension,
        monthlyRentalIncome: monthlyRental,
        safeWithdrawalRate: 3.5,
      },
      preRetirement: preRetirementYears,
      postRetirement: postRetirementYears,
    };
  }),

  // Monte Carlo simulation — run N simulations with randomized returns
  monteCarlo: authedQuery
    .input(z.object({
      simulations: z.number().int().min(100).max(5000).default(1000),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const uProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });
      const fProfile = await db.query.financialProfiles.findFirst({
        where: eq(financialProfiles.userId, ctx.user.id),
      });
      const model = await db.query.retirementModels.findFirst({
        where: eq(retirementModels.userId, ctx.user.id),
      });

      if (!uProfile || !fProfile) return null;

      const age = uProfile.age;
      const retirementAge = model?.retirementAge ?? 60;
      const yearsToRetirement = Math.max(retirementAge - age, 1);
      const currentAssets = Number(fProfile.totalAssets);
      const monthlyIncome = Number(fProfile.monthlyIncome);
      const monthlyExpenses = Number(fProfile.monthlyExpenses);
      const monthlySavings = Math.max(monthlyIncome - monthlyExpenses, 0);

      // Parameters for return distribution (mean, std dev)
      const meanReturn = 0.10; // 10% average annual return
      const stdDev = 0.15; // 15% annual volatility (Indian equity market historical)
      const inflationMean = 0.06;
      const inflationStd = 0.02;
      const numSims = input?.simulations ?? 1000;

      // Box-Muller transform for normal random numbers
      function normalRandom(mean: number, std: number): number {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + std * z;
      }

      // Run simulations
      const allPaths: number[][] = [];
      const finalCorpusValues: number[] = [];

      for (let sim = 0; sim < numSims; sim++) {
        let corpus = currentAssets;
        let annualSavings = monthlySavings * 12;
        const path: number[] = [corpus];

        for (let year = 1; year <= yearsToRetirement; year++) {
          const yearReturn = normalRandom(meanReturn, stdDev);
          const yearInflation = normalRandom(inflationMean, inflationStd);
          corpus = corpus * (1 + yearReturn) + annualSavings;
          annualSavings *= (1 + Math.min(yearInflation, 0.10)); // salary grows ~ inflation
          path.push(Math.round(corpus));
        }

        allPaths.push(path);
        finalCorpusValues.push(corpus);
      }

      // Calculate percentiles for each year
      const percentileData: Array<{
        year: number;
        age: number;
        p10: number;
        p25: number;
        p50: number;
        p75: number;
        p90: number;
      }> = [];

      for (let y = 0; y <= yearsToRetirement; y++) {
        const values = allPaths.map((p) => p[y]).sort((a, b) => a - b);
        percentileData.push({
          year: y,
          age: age + y,
          p10: Math.round(values[Math.floor(numSims * 0.10)]),
          p25: Math.round(values[Math.floor(numSims * 0.25)]),
          p50: Math.round(values[Math.floor(numSims * 0.50)]),
          p75: Math.round(values[Math.floor(numSims * 0.75)]),
          p90: Math.round(values[Math.floor(numSims * 0.90)]),
        });
      }

      // Final corpus stats
      finalCorpusValues.sort((a, b) => a - b);
      const corpusNeeded = model
        ? Number(model.currentMonthlyExpense) * Math.pow(1.06, yearsToRetirement) * 0.7 * 12 / 0.035
        : monthlySavings * 12 * 25;

      return {
        simulations: numSims,
        percentileData,
        corpusTarget: Math.round(corpusNeeded),
        finalCorpus: {
          p10: Math.round(finalCorpusValues[Math.floor(numSims * 0.10)]),
          p25: Math.round(finalCorpusValues[Math.floor(numSims * 0.25)]),
          p50: Math.round(finalCorpusValues[Math.floor(numSims * 0.50)]),
          p75: Math.round(finalCorpusValues[Math.floor(numSims * 0.75)]),
          p90: Math.round(finalCorpusValues[Math.floor(numSims * 0.90)]),
        },
        successRate: Math.round(
          (finalCorpusValues.filter((v) => v >= corpusNeeded).length / numSims) * 100
        ),
      };
    }),
});

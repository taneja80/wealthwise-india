import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cashFlowProjections, goals, financialProfiles, userProfiles } from "@db/schema";
import { eq } from "drizzle-orm";

function calculateCashFlows(
  age: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  totalAssets: number,
  totalLiabilities: number,
  planningHorizon: number,
  inflationScenario: string,
  goalList: Array<{ targetAmount: number; currentAmount: number; timelineYears: number; monthlyContribution: number; expectedReturn: number; name: string }>,
) {
  const inflationRates: Record<string, number> = {
    low: 0.04,
    moderate: 0.06,
    high: 0.08,
  };
  const inflation = inflationRates[inflationScenario] ?? 0.06;
  const incomeGrowth = 0.05;
  const projections = [];
  let currentNetWorth = totalAssets - totalLiabilities;
  let currentIncome = monthlyIncome * 12;
  let currentExpenses = monthlyExpenses * 12;

  for (let year = 1; year <= planningHorizon; year++) {
    const currentAge = age + year;
    let yearlyIncome = currentIncome * Math.pow(1 + incomeGrowth, year - 1);
    let yearlyExpenses = currentExpenses * Math.pow(1 + inflation, year - 1);

    if (currentAge >= 60) {
      yearlyIncome *= 0.3;
      yearlyExpenses *= 0.7;
    }

    let totalGoalContribution = 0;
    const goalContributions: Record<string, number> = {};

    for (const goal of goalList) {
      if (year <= goal.timelineYears) {
        const contribution = goal.monthlyContribution * 12;
        totalGoalContribution += contribution;
        goalContributions[goal.name] = contribution;
      }
    }

    const savings = yearlyIncome - yearlyExpenses - totalGoalContribution;
    const investments = totalGoalContribution + (savings > 0 ? savings * 0.7 : 0);
    const netWorthGrowth = currentNetWorth * 0.07 + investments;
    currentNetWorth += netWorthGrowth;

    projections.push({
      year,
      age: currentAge,
      income: Math.round(yearlyIncome),
      expenses: Math.round(yearlyExpenses),
      savings: Math.round(savings),
      investments: Math.round(investments),
      netWorth: Math.round(currentNetWorth),
      goalContributions,
    });
  }

  return projections;
}

export const cashFlowRouter = createRouter({
  generate: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const profile = await db.query.financialProfiles.findFirst({
      where: eq(financialProfiles.userId, ctx.user.id),
    });
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    });
    const goalList = await db.query.goals.findMany({
      where: eq(goals.userId, ctx.user.id),
    });

    if (!profile || !userProfile) {
      return null;
    }

    const age = userProfile.age ?? 30;
    const monthlyIncome = Number(profile.monthlyIncome);
    const monthlyExpenses = Number(profile.monthlyExpenses);
    const totalAssets = Number(profile.totalAssets);
    const totalLiabilities = Number(profile.totalLiabilities);
    const planningHorizon = profile.planningHorizon ?? 30;
    const inflationScenario = profile.inflationScenario ?? "moderate";

    const formattedGoals = goalList.map((g) => ({
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      timelineYears: g.timelineYears,
      monthlyContribution: Number(g.monthlyContribution),
      expectedReturn: Number(g.expectedReturn),
      name: g.name,
    }));

    const projections = calculateCashFlows(
      age,
      monthlyIncome,
      monthlyExpenses,
      totalAssets,
      totalLiabilities,
      planningHorizon,
      inflationScenario,
      formattedGoals,
    );

    await db.delete(cashFlowProjections).where(eq(cashFlowProjections.userId, ctx.user.id));

    for (const proj of projections) {
      await db.insert(cashFlowProjections).values({
        userId: ctx.user.id,
        year: proj.year,
        age: proj.age,
        income: String(proj.income),
        expenses: String(proj.expenses),
        savings: String(proj.savings),
        investments: String(proj.investments),
        netWorth: String(proj.netWorth),
        goalContributions: proj.goalContributions,
      });
    }

    return projections;
  }),

  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.cashFlowProjections.findMany({
      where: eq(cashFlowProjections.userId, ctx.user.id),
      orderBy: (cashFlowProjections, { asc }) => [asc(cashFlowProjections.year)],
    });
  }),
});

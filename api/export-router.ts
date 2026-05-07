import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  userProfiles,
  financialProfiles,
  goals,
  cashFlowProjections,
  assetHoldings,
  investmentAllocations,
  taxProfiles,
  retirementModels,
} from "@db/schema";
import { eq } from "drizzle-orm";

function toCsvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return "";
      const str = String(v);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return [toCsvRow(headers), ...rows.map(toCsvRow)].join("\n");
}

export const exportRouter = createRouter({
  /**
   * Export all financial data as CSV sections concatenated together.
   */
  allData: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    // Fetch all data in parallel
    const [profile, fProfile, goalList, cashFlows, holdings, allocations, tax, retirement] =
      await Promise.all([
        db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) }),
        db.query.financialProfiles.findFirst({ where: eq(financialProfiles.userId, userId) }),
        db.query.goals.findMany({ where: eq(goals.userId, userId) }),
        db.query.cashFlowProjections.findMany({
          where: eq(cashFlowProjections.userId, userId),
          orderBy: (cf, { asc }) => [asc(cf.year)],
        }),
        db.query.assetHoldings.findMany({ where: eq(assetHoldings.userId, userId) }),
        db.query.investmentAllocations.findMany({ where: eq(investmentAllocations.userId, userId) }),
        db.query.taxProfiles.findFirst({ where: eq(taxProfiles.userId, userId) }),
        db.query.retirementModels.findFirst({ where: eq(retirementModels.userId, userId) }),
      ]);

    const sections: string[] = [];

    // --- User Profile ---
    if (profile) {
      sections.push("--- USER PROFILE ---");
      sections.push(
        toCsv(
          ["Age", "Profession", "Family Status", "Dependents", "City"],
          [[profile.age, profile.profession, profile.familyStatus, profile.dependents, profile.city]],
        ),
      );
    }

    // --- Financial Profile ---
    if (fProfile) {
      sections.push("\n--- FINANCIAL PROFILE ---");
      sections.push(
        toCsv(
          [
            "Monthly Income",
            "Monthly Expenses",
            "Emergency Fund",
            "Total Assets",
            "Total Liabilities",
            "Equity",
            "Debt",
            "Real Estate",
            "Gold",
            "Other Assets",
            "Inflation Scenario",
            "Planning Horizon (yrs)",
          ],
          [
            [
              fProfile.monthlyIncome,
              fProfile.monthlyExpenses,
              fProfile.emergencyFund,
              fProfile.totalAssets,
              fProfile.totalLiabilities,
              fProfile.equityInvestments,
              fProfile.debtInvestments,
              fProfile.realEstate,
              fProfile.gold,
              fProfile.otherAssets,
              fProfile.inflationScenario,
              fProfile.planningHorizon,
            ],
          ],
        ),
      );
    }

    // --- Goals ---
    if (goalList.length > 0) {
      sections.push("\n--- GOALS ---");
      sections.push(
        toCsv(
          ["Name", "Category", "Target Amount", "Current Amount", "Timeline (yrs)", "Priority", "Monthly Contribution", "Expected Return (%)"],
          goalList.map((g) => [
            g.name,
            g.category,
            g.targetAmount,
            g.currentAmount,
            g.timelineYears,
            g.priority,
            g.monthlyContribution,
            g.expectedReturn,
          ]),
        ),
      );
    }

    // --- Asset Holdings ---
    if (holdings.length > 0) {
      sections.push("\n--- ASSET HOLDINGS ---");
      sections.push(
        toCsv(
          ["Asset Class", "Instrument", "Current Value", "Monthly SIP", "Expected Return (%)", "Risk Score", "Tax Treatment"],
          holdings.map((h) => [
            h.assetClass,
            h.instrument,
            h.currentValue,
            h.monthlySip,
            h.expectedReturn,
            h.riskScore,
            h.taxTreatment,
          ]),
        ),
      );
    }

    // --- Investment Allocations ---
    if (allocations.length > 0) {
      sections.push("\n--- INVESTMENT ALLOCATIONS ---");
      sections.push(
        toCsv(
          ["Goal ID", "Asset Class", "Allocation (%)", "Recommended Amount", "Expected Return (%)", "Risk Level"],
          allocations.map((a) => [
            a.goalId,
            a.assetClass,
            a.allocationPercent,
            a.recommendedAmount,
            a.expectedReturn,
            a.riskLevel,
          ]),
        ),
      );
    }

    // --- Cash Flow Projections ---
    if (cashFlows.length > 0) {
      sections.push("\n--- CASH FLOW PROJECTIONS ---");
      sections.push(
        toCsv(
          ["Year", "Age", "Income", "Expenses", "Savings", "Investments", "Net Worth"],
          cashFlows.map((cf) => [
            cf.year,
            cf.age,
            cf.income,
            cf.expenses,
            cf.savings,
            cf.investments,
            cf.netWorth,
          ]),
        ),
      );
    }

    // --- Tax Profile ---
    if (tax) {
      sections.push("\n--- TAX PROFILE ---");
      sections.push(
        toCsv(
          ["Regime", "80C", "80D Self", "80D Parents", "80CCD(1B)", "24(b)", "80E", "80G", "HRA", "LTA", "NPS", "PPF", "EPF", "Health Insurance"],
          [
            [
              tax.regime,
              tax.section80c,
              tax.section80dSelf,
              tax.section80dParents,
              tax.section80ccd1b,
              tax.section24b,
              tax.section80e,
              tax.section80g,
              tax.hraExemption,
              tax.ltaClaimed,
              tax.hasNps,
              tax.hasPpf,
              tax.hasEpf,
              tax.hasHealthInsurance,
            ],
          ],
        ),
      );
    }

    // --- Retirement Model ---
    if (retirement) {
      sections.push("\n--- RETIREMENT MODEL ---");
      sections.push(
        toCsv(
          [
            "Retirement Age",
            "Monthly Expense",
            "Post-Retirement Expense %",
            "Healthcare Inflation %",
            "Lifestyle Inflation %",
            "Life Expectancy",
            "Desired Corpus",
            "Monthly Pension",
            "Rental Income",
          ],
          [
            [
              retirement.retirementAge,
              retirement.currentMonthlyExpense,
              retirement.postRetirementExpensePercent,
              retirement.healthcareInflation,
              retirement.lifestyleInflation,
              retirement.lifeExpectancy,
              retirement.desiredCorpus,
              retirement.monthlyPension,
              retirement.rentalIncomePostRetirement,
            ],
          ],
        ),
      );
    }

    return {
      csv: sections.join("\n"),
      filename: `wealthwise-export-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }),
});

import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { investmentAllocations, goals } from "@db/schema";
import { eq, and } from "drizzle-orm";

const assetClassReturns: Record<string, number> = {
  equity: 12,
  debt: 7,
  gold: 8,
  real_estate: 10,
  liquid: 4,
  international: 11,
};

function getAllocationForGoal(
  category: string,
  timelineYears: number,
  priority: string,
  monthlyContribution: number,
) {
  let baseAllocation: Record<string, number>;

  if (timelineYears <= 3) {
    baseAllocation = {
      debt: 60,
      liquid: 25,
      gold: 10,
      equity: 5,
      real_estate: 0,
      international: 0,
    };
  } else if (timelineYears <= 7) {
    baseAllocation = {
      debt: 40,
      equity: 35,
      gold: 10,
      liquid: 10,
      real_estate: 5,
      international: 0,
    };
  } else if (timelineYears <= 15) {
    baseAllocation = {
      equity: 50,
      debt: 25,
      real_estate: 10,
      gold: 5,
      international: 5,
      liquid: 5,
    };
  } else {
    baseAllocation = {
      equity: 60,
      debt: 15,
      real_estate: 10,
      international: 8,
      gold: 4,
      liquid: 3,
    };
  }

  if (category === "retirement") {
    baseAllocation.equity = Math.min((baseAllocation.equity ?? 0) + 5, 70);
    baseAllocation.debt = Math.max((baseAllocation.debt ?? 0) - 5, 10);
  } else if (category === "emergency") {
    baseAllocation.liquid = 50;
    baseAllocation.debt = 40;
    baseAllocation.equity = 5;
    baseAllocation.gold = 5;
  } else if (category === "home") {
    baseAllocation.debt = Math.min((baseAllocation.debt ?? 0) + 10, 50);
    baseAllocation.real_estate = Math.min((baseAllocation.real_estate ?? 0) + 5, 20);
  }

  if (priority === "high") {
    baseAllocation.debt = Math.min((baseAllocation.debt ?? 0) + 5, 60);
    baseAllocation.equity = Math.max((baseAllocation.equity ?? 0) - 5, 10);
  }

  const total = Object.values(baseAllocation).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    const diff = 100 - total;
    baseAllocation.debt = (baseAllocation.debt ?? 0) + diff;
  }

  const allocations = [];
  const totalContribution = monthlyContribution * 12 * timelineYears;
  for (const [assetClass, percent] of Object.entries(baseAllocation)) {
    if (percent > 0) {
      allocations.push({
        assetClass,
        allocationPercent: percent,
        recommendedAmount: Math.round((totalContribution * percent) / 100),
        expectedReturn: assetClassReturns[assetClass] ?? 8,
        riskLevel:
          percent > 50
            ? "aggressive"
            : percent > 30
              ? "moderate"
              : "conservative",
      });
    }
  }

  return allocations;
}

export const allocationRouter = createRouter({
  generate: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const goalList = await db.query.goals.findMany({
      where: eq(goals.userId, ctx.user.id),
    });

    await db
      .delete(investmentAllocations)
      .where(eq(investmentAllocations.userId, ctx.user.id));

    const allAllocations = [];
    for (const goal of goalList) {
      const allocations = getAllocationForGoal(
        goal.category,
        goal.timelineYears,
        goal.priority ?? "medium",
        Number(goal.monthlyContribution),
      );

      for (const alloc of allocations) {
        const result = await db.insert(investmentAllocations).values({
          userId: ctx.user.id,
          goalId: goal.id,
          assetClass: alloc.assetClass as any,
          allocationPercent: String(alloc.allocationPercent),
          recommendedAmount: String(alloc.recommendedAmount),
          expectedReturn: String(alloc.expectedReturn),
          riskLevel: alloc.riskLevel as any,
        });
        allAllocations.push({
          id: Number((result as any).insertId),
          goalId: goal.id,
          goalName: goal.name,
          ...alloc,
        });
      }
    }

    return allAllocations;
  }),

  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const allocs = await db.query.investmentAllocations.findMany({
      where: eq(investmentAllocations.userId, ctx.user.id),
    });

    const goalList = await db.query.goals.findMany({
      where: eq(goals.userId, ctx.user.id),
    });

    return allocs.map((a) => ({
      ...a,
      goalName: goalList.find((g) => g.id === a.goalId)?.name ?? "",
    }));
  }),

  getByGoal: authedQuery
    .input(z.object({ goalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db.query.investmentAllocations.findMany({
        where: and(
          eq(investmentAllocations.userId, ctx.user.id),
          eq(investmentAllocations.goalId, input.goalId),
        ),
      });
    }),
});

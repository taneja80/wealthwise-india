import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userProfiles, financialProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

export const profileRouter = createRouter({
  getUserProfile: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    });
    return profile ?? null;
  }),

  createUserProfile: authedQuery
    .input(
      z.object({
        age: z.number().min(18).max(100),
        profession: z.string().min(1).max(255),
        familyStatus: z.enum(["single", "married", "married_with_children", "retired"]),
        dependents: z.number().min(0).max(20).default(0),
        city: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      return db.transaction(async (tx) => {
        const existing = await tx.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, ctx.user.id),
        });
        if (existing) {
          await tx
            .update(userProfiles)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(userProfiles.userId, ctx.user.id));
          return { success: true, updated: true };
        }
        await tx.insert(userProfiles).values({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true, updated: false };
      });
    }),

  getFinancialProfile: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const profile = await db.query.financialProfiles.findFirst({
      where: eq(financialProfiles.userId, ctx.user.id),
    });
    return profile ?? null;
  }),

  createFinancialProfile: authedQuery
    .input(
      z.object({
        monthlyIncome: safeDecimal({ min: 0 }),
        monthlyExpenses: safeDecimal({ min: 0 }),
        emergencyFund: safeDecimal({ min: 0 }).default(0),
        totalAssets: safeDecimal({ min: 0 }).default(0),
        totalLiabilities: safeDecimal({ min: 0 }).default(0),
        equityInvestments: safeDecimal({ min: 0 }).default(0),
        debtInvestments: safeDecimal({ min: 0 }).default(0),
        realEstate: safeDecimal({ min: 0 }).default(0),
        gold: safeDecimal({ min: 0 }).default(0),
        otherAssets: safeDecimal({ min: 0 }).default(0),
        inflationScenario: z.enum(["low", "moderate", "high"]).default("moderate"),
        planningHorizon: z.number().int().min(1).max(50).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const data = {
        monthlyIncome: String(input.monthlyIncome),
        monthlyExpenses: String(input.monthlyExpenses),
        emergencyFund: String(input.emergencyFund),
        totalAssets: String(input.totalAssets),
        totalLiabilities: String(input.totalLiabilities),
        equityInvestments: String(input.equityInvestments),
        debtInvestments: String(input.debtInvestments),
        realEstate: String(input.realEstate),
        gold: String(input.gold),
        otherAssets: String(input.otherAssets),
        inflationScenario: input.inflationScenario,
        planningHorizon: input.planningHorizon,
      };
      return db.transaction(async (tx) => {
        const existing = await tx.query.financialProfiles.findFirst({
          where: eq(financialProfiles.userId, ctx.user.id),
        });
        if (existing) {
          await tx
            .update(financialProfiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(financialProfiles.userId, ctx.user.id));
          return { success: true, updated: true };
        }
        await tx.insert(financialProfiles).values({
          ...data,
          userId: ctx.user.id,
        });
        return { success: true, updated: false };
      });
    }),
});

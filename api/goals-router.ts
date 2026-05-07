import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { goals } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

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
});

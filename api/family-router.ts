import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { familyMembers } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

const memberInput = z.object({
  name: z.string().min(1).max(255),
  relation: z.enum(["self", "spouse", "parent", "child", "sibling"]),
  age: z.number().int().min(0).max(120).nullish(),
  monthlyIncome: safeDecimal({ min: 0 }).default(0),
  monthlyExpenses: safeDecimal({ min: 0 }).default(0),
  totalAssets: safeDecimal({ min: 0 }).default(0),
  totalLiabilities: safeDecimal({ min: 0 }).default(0),
  notes: z.string().max(500).nullish(),
});

export const familyRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.familyMembers.findMany({
      where: eq(familyMembers.userId, ctx.user.id),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });
  }),

  create: authedQuery
    .input(memberInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [row] = await db.insert(familyMembers).values({
        userId: ctx.user.id,
        name: input.name,
        relation: input.relation,
        age: input.age ?? null,
        monthlyIncome: String(input.monthlyIncome),
        monthlyExpenses: String(input.monthlyExpenses),
        totalAssets: String(input.totalAssets),
        totalLiabilities: String(input.totalLiabilities),
        notes: input.notes ?? null,
      }).returning();
      return row;
    }),

  update: authedQuery
    .input(z.object({ id: z.number().int() }).merge(memberInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.relation !== undefined) updates.relation = data.relation;
      if (data.age !== undefined) updates.age = data.age ?? null;
      if (data.monthlyIncome !== undefined) updates.monthlyIncome = String(data.monthlyIncome);
      if (data.monthlyExpenses !== undefined) updates.monthlyExpenses = String(data.monthlyExpenses);
      if (data.totalAssets !== undefined) updates.totalAssets = String(data.totalAssets);
      if (data.totalLiabilities !== undefined) updates.totalLiabilities = String(data.totalLiabilities);
      if (data.notes !== undefined) updates.notes = data.notes ?? null;

      await db.update(familyMembers)
        .set(updates)
        .where(and(eq(familyMembers.id, id), eq(familyMembers.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(familyMembers)
        .where(and(eq(familyMembers.id, input.id), eq(familyMembers.userId, ctx.user.id)));
      return { success: true };
    }),

  // Aggregated family finances
  summary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const members = await db.query.familyMembers.findMany({
      where: eq(familyMembers.userId, ctx.user.id),
    });
    const totalIncome = members.reduce((s, m) => s + Number(m.monthlyIncome), 0);
    const totalExpenses = members.reduce((s, m) => s + Number(m.monthlyExpenses), 0);
    const totalAssets = members.reduce((s, m) => s + Number(m.totalAssets), 0);
    const totalLiabilities = members.reduce((s, m) => s + Number(m.totalLiabilities), 0);
    return {
      memberCount: members.length,
      totalMonthlyIncome: Math.round(totalIncome),
      totalMonthlyExpenses: Math.round(totalExpenses),
      totalAssets: Math.round(totalAssets),
      totalLiabilities: Math.round(totalLiabilities),
      netWorth: Math.round(totalAssets - totalLiabilities),
    };
  }),
});

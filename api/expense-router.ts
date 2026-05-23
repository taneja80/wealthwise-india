import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { expenseBreakdown } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

const CATEGORIES = [
  "rent", "groceries", "utilities", "emi", "insurance", "entertainment",
  "education", "healthcare", "transport", "subscriptions", "shopping", "dining", "other",
] as const;

export const expenseRouter = createRouter({
  list: authedQuery
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db.query.expenseBreakdown.findMany({
        where: and(
          eq(expenseBreakdown.userId, ctx.user.id),
          eq(expenseBreakdown.month, input.month),
        ),
        orderBy: (e, { desc }) => [desc(e.amount)],
      });
    }),

  upsert: authedQuery
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      categories: z.array(z.object({
        category: z.enum(CATEGORIES),
        amount: safeDecimal({ min: 0 }),
        notes: z.string().max(200).nullish(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Delete existing for this month then re-insert
      await db.delete(expenseBreakdown)
        .where(and(
          eq(expenseBreakdown.userId, ctx.user.id),
          eq(expenseBreakdown.month, input.month),
        ));

      if (input.categories.length > 0) {
        await db.insert(expenseBreakdown).values(
          input.categories
            .filter((c) => c.amount > 0)
            .map((c) => ({
              userId: ctx.user.id,
              category: c.category,
              amount: String(c.amount),
              month: input.month,
              notes: c.notes ?? null,
            })),
        );
      }
      return { success: true };
    }),

  // Get summary across months
  trend: authedQuery
    .input(z.object({ months: z.number().int().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const all = await db.query.expenseBreakdown.findMany({
        where: eq(expenseBreakdown.userId, ctx.user.id),
        orderBy: (e, { asc }) => [asc(e.month)],
      });

      // Group by month
      const byMonth: Record<string, Record<string, number>> = {};
      for (const row of all) {
        if (!byMonth[row.month]) byMonth[row.month] = {};
        byMonth[row.month][row.category] = Number(row.amount);
      }

      // Return only last N months
      const months = Object.keys(byMonth).sort().slice(-input.months);
      return months.map((month) => ({
        month,
        categories: byMonth[month],
        total: Object.values(byMonth[month]).reduce((s, v) => s + v, 0),
      }));
    }),
});

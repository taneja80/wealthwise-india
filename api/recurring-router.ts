import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recurringTransactions } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { safeDecimal } from "./lib/validation";

const txnInput = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["sip", "emi", "subscription", "insurance", "rent", "other"]),
  amount: safeDecimal({ min: 1 }),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).default("monthly"),
  dueDay: z.number().int().min(1).max(31),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  autoPay: z.boolean().default(false),
  notes: z.string().max(500).nullish(),
});

export const recurringRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.recurringTransactions.findMany({
      where: eq(recurringTransactions.userId, ctx.user.id),
      orderBy: (t, { asc }) => [asc(t.dueDay)],
    });
  }),

  create: authedQuery
    .input(txnInput)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [row] = await db.insert(recurringTransactions).values({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        amount: String(input.amount),
        frequency: input.frequency,
        dueDay: input.dueDay,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        autoPay: input.autoPay,
        notes: input.notes ?? null,
      }).returning();
      return row;
    }),

  update: authedQuery
    .input(z.object({ id: z.number().int() }).merge(txnInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.type !== undefined) updates.type = data.type;
      if (data.amount !== undefined) updates.amount = String(data.amount);
      if (data.frequency !== undefined) updates.frequency = data.frequency;
      if (data.dueDay !== undefined) updates.dueDay = data.dueDay;
      if (data.startDate !== undefined) updates.startDate = data.startDate;
      if (data.endDate !== undefined) updates.endDate = data.endDate ?? null;
      if (data.autoPay !== undefined) updates.autoPay = data.autoPay;
      if (data.notes !== undefined) updates.notes = data.notes ?? null;

      await db.update(recurringTransactions)
        .set(updates)
        .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(recurringTransactions)
        .where(and(eq(recurringTransactions.id, input.id), eq(recurringTransactions.userId, ctx.user.id)));
      return { success: true };
    }),

  // Get upcoming debits for next N days
  upcoming: authedQuery
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const days = input?.days ?? 30;
      const txns = await db.query.recurringTransactions.findMany({
        where: eq(recurringTransactions.userId, ctx.user.id),
      });

      const today = new Date();
      const upcoming: Array<{
        id: number;
        name: string;
        type: string;
        amount: string;
        date: string;
        autoPay: boolean | null;
      }> = [];

      for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        const dayOfMonth = date.getDate();
        const dateStr = date.toISOString().slice(0, 10);

        for (const txn of txns) {
          // Check if end date passed
          if (txn.endDate && dateStr > txn.endDate) continue;
          if (dateStr < txn.startDate) continue;

          let matches = false;
          if (txn.frequency === "weekly" && date.getDay() === new Date(txn.startDate).getDay()) {
            matches = true;
          } else if (txn.frequency === "monthly" && dayOfMonth === txn.dueDay) {
            matches = true;
          } else if (txn.frequency === "quarterly" && dayOfMonth === txn.dueDay) {
            const monthsDiff = (date.getFullYear() - new Date(txn.startDate).getFullYear()) * 12 +
              date.getMonth() - new Date(txn.startDate).getMonth();
            if (monthsDiff % 3 === 0) matches = true;
          } else if (txn.frequency === "yearly" && dayOfMonth === txn.dueDay &&
            date.getMonth() === new Date(txn.startDate).getMonth()) {
            matches = true;
          }

          if (matches) {
            upcoming.push({
              id: txn.id,
              name: txn.name,
              type: txn.type,
              amount: txn.amount,
              date: dateStr,
              autoPay: txn.autoPay,
            });
          }
        }
      }

      upcoming.sort((a, b) => a.date.localeCompare(b.date));
      return upcoming;
    }),

  // Monthly total
  monthlyTotal: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const txns = await db.query.recurringTransactions.findMany({
      where: eq(recurringTransactions.userId, ctx.user.id),
    });
    let total = 0;
    for (const txn of txns) {
      const amount = Number(txn.amount);
      switch (txn.frequency) {
        case "weekly": total += amount * 4.33; break;
        case "monthly": total += amount; break;
        case "quarterly": total += amount / 3; break;
        case "yearly": total += amount / 12; break;
      }
    }
    return { monthlyTotal: Math.round(total) };
  }),
});

import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  users,
  localUsers,
  userProfiles,
  financialProfiles,
  goals,
  cashFlowProjections,
  investmentAllocations,
  assetHoldings,
  assetProjections,
  taxProfiles,
  retirementModels,
  chatMessages,
} from "@db/schema";
import { eq } from "drizzle-orm";
import { LOCAL_USER_OFFSET } from "./context";
import { enforceRateLimit, RateLimits } from "./lib/rate-limit";

export const accountRouter = createRouter({
  /**
   * Delete the current user's account and all associated data.
   * Requires the user to confirm by typing "DELETE" as a safety measure.
   */
  deleteAccount: authedQuery
    .input(
      z.object({
        confirmation: z
          .string()
          .refine((v) => v === "DELETE", {
            message: 'You must type "DELETE" to confirm account deletion',
          }),
      }),
    )
    .mutation(async ({ ctx }) => {
      enforceRateLimit(ctx, "account-delete", RateLimits.auth);

      const db = getDb();
      const userId = ctx.user.id;

      await db.transaction(async (tx) => {
        // Delete all user data in dependency order
        await tx.delete(chatMessages).where(eq(chatMessages.userId, userId));
        await tx.delete(assetProjections).where(eq(assetProjections.userId, userId));
        await tx.delete(investmentAllocations).where(eq(investmentAllocations.userId, userId));
        await tx.delete(assetHoldings).where(eq(assetHoldings.userId, userId));
        await tx.delete(cashFlowProjections).where(eq(cashFlowProjections.userId, userId));
        await tx.delete(goals).where(eq(goals.userId, userId));
        await tx.delete(taxProfiles).where(eq(taxProfiles.userId, userId));
        await tx.delete(retirementModels).where(eq(retirementModels.userId, userId));
        await tx.delete(financialProfiles).where(eq(financialProfiles.userId, userId));
        await tx.delete(userProfiles).where(eq(userProfiles.userId, userId));

        // Delete the user record itself
        if (ctx.user.source === "oauth") {
          await tx.delete(users).where(eq(users.id, userId));
        } else {
          const realId = userId - LOCAL_USER_OFFSET;
          await tx.delete(localUsers).where(eq(localUsers.id, realId));
        }
      });

      return { success: true };
    }),
});

import { relations } from "drizzle-orm";
import { users, localUsers, userProfiles, financialProfiles, goals, cashFlowProjections, investmentAllocations, assetHoldings, taxProfiles, retirementModels, assetProjections, chatMessages } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  goals: many(goals),
  cashFlows: many(cashFlowProjections),
  investments: many(investmentAllocations),
  assetHoldings: many(assetHoldings),
  assetProjections: many(assetProjections),
  chats: many(chatMessages),
}));

export const userProfilesRelations = relations(userProfiles, () => ({}));
export const financialProfilesRelations = relations(financialProfiles, () => ({}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
}));

export const cashFlowProjectionsRelations = relations(cashFlowProjections, ({ one }) => ({
  user: one(users, { fields: [cashFlowProjections.userId], references: [users.id] }),
}));

export const investmentAllocationsRelations = relations(investmentAllocations, () => ({}));
export const assetHoldingsRelations = relations(assetHoldings, () => ({}));
export const taxProfilesRelations = relations(taxProfiles, () => ({}));
export const retirementModelsRelations = relations(retirementModels, () => ({}));
export const assetProjectionsRelations = relations(assetProjections, () => ({}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}));

export const localUsersRelations = relations(localUsers, () => ({}));

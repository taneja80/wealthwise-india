import { relations } from "drizzle-orm";
import { localUsers, userProfiles, financialProfiles, goals, cashFlowProjections, investmentAllocations, assetHoldings, taxProfiles, retirementModels, assetProjections, chatMessages, recurringTransactions, familyMembers, expenseBreakdown } from "./schema";

export const localUsersRelations = relations(localUsers, ({ many }) => ({
  goals: many(goals),
  cashFlows: many(cashFlowProjections),
  investments: many(investmentAllocations),
  assetHoldings: many(assetHoldings),
  assetProjections: many(assetProjections),
  chats: many(chatMessages),
  recurringTransactions: many(recurringTransactions),
  familyMembers: many(familyMembers),
  expenseBreakdown: many(expenseBreakdown),
}));

export const userProfilesRelations = relations(userProfiles, () => ({}));
export const financialProfilesRelations = relations(financialProfiles, () => ({}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(localUsers, { fields: [goals.userId], references: [localUsers.id] }),
}));

export const cashFlowProjectionsRelations = relations(cashFlowProjections, ({ one }) => ({
  user: one(localUsers, { fields: [cashFlowProjections.userId], references: [localUsers.id] }),
}));

export const investmentAllocationsRelations = relations(investmentAllocations, () => ({}));
export const assetHoldingsRelations = relations(assetHoldings, () => ({}));
export const taxProfilesRelations = relations(taxProfiles, () => ({}));
export const retirementModelsRelations = relations(retirementModels, () => ({}));
export const assetProjectionsRelations = relations(assetProjections, () => ({}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(localUsers, { fields: [chatMessages.userId], references: [localUsers.id] }),
}));

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one }) => ({
  user: one(localUsers, { fields: [recurringTransactions.userId], references: [localUsers.id] }),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  user: one(localUsers, { fields: [familyMembers.userId], references: [localUsers.id] }),
}));

export const expenseBreakdownRelations = relations(expenseBreakdown, ({ one }) => ({
  user: one(localUsers, { fields: [expenseBreakdown.userId], references: [localUsers.id] }),
}));

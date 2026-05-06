import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";

// ---- Enums ----
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const familyStatusEnum = pgEnum("family_status", ["single", "married", "married_with_children", "retired"]);
export const inflationScenarioEnum = pgEnum("inflation_scenario", ["low", "moderate", "high"]);
export const goalCategoryEnum = pgEnum("goal_category", [
  "retirement",
  "education",
  "home",
  "vehicle",
  "wedding",
  "travel",
  "emergency",
  "wealth",
  "other",
]);
export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const assetClassEnum = pgEnum("asset_class", [
  "equity",
  "debt",
  "gold",
  "real_estate",
  "liquid",
  "international",
]);
export const riskLevelEnum = pgEnum("risk_level", ["conservative", "moderate", "aggressive"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);
export const taxTreatmentEnum = pgEnum("tax_treatment", [
  "equity_ltcg",
  "debt_interest",
  "debt_ltcg",
  "gold_ltcg",
  "real_estate_ltcg",
  "tax_free",
  "epf_tax_deferred",
]);
export const regimeEnum = pgEnum("regime", ["old", "new"]);

// ---- Users (OAuth) ----
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---- Local Users (email/password) ----
export const localUsers = pgTable("local_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt", { mode: "date" }).defaultNow().notNull(),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

// ---- User Profiles ----
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  age: integer("age").notNull(),
  profession: varchar("profession", { length: 255 }),
  familyStatus: familyStatusEnum("familyStatus").default("single"),
  dependents: integer("dependents").default(0),
  city: varchar("city", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// ---- Financial Profiles ----
export const financialProfiles = pgTable("financial_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  monthlyIncome: decimal("monthlyIncome", { precision: 15, scale: 2 }).notNull(),
  monthlyExpenses: decimal("monthlyExpenses", { precision: 15, scale: 2 }).notNull(),
  emergencyFund: decimal("emergencyFund", { precision: 15, scale: 2 }).default("0"),
  totalAssets: decimal("totalAssets", { precision: 15, scale: 2 }).default("0"),
  totalLiabilities: decimal("totalLiabilities", { precision: 15, scale: 2 }).default("0"),
  equityInvestments: decimal("equityInvestments", { precision: 15, scale: 2 }).default("0"),
  debtInvestments: decimal("debtInvestments", { precision: 15, scale: 2 }).default("0"),
  realEstate: decimal("realEstate", { precision: 15, scale: 2 }).default("0"),
  gold: decimal("gold", { precision: 15, scale: 2 }).default("0"),
  otherAssets: decimal("otherAssets", { precision: 15, scale: 2 }).default("0"),
  inflationScenario: inflationScenarioEnum("inflationScenario").default("moderate"),
  planningHorizon: integer("planningHorizon").default(30),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// ---- Goals ----
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: goalCategoryEnum("category").notNull(),
  targetAmount: decimal("targetAmount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("currentAmount", { precision: 15, scale: 2 }).default("0"),
  timelineYears: integer("timelineYears").notNull(),
  priority: priorityEnum("priority").default("medium"),
  description: text("description"),
  monthlyContribution: decimal("monthlyContribution", { precision: 15, scale: 2 }).default("0"),
  expectedReturn: decimal("expectedReturn", { precision: 5, scale: 2 }).default("8.00"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// ---- Cash Flow Projections ----
export const cashFlowProjections = pgTable("cash_flow_projections", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  year: integer("year").notNull(),
  age: integer("age"),
  income: decimal("income", { precision: 15, scale: 2 }).notNull(),
  expenses: decimal("expenses", { precision: 15, scale: 2 }).notNull(),
  savings: decimal("savings", { precision: 15, scale: 2 }).notNull(),
  investments: decimal("investments", { precision: 15, scale: 2 }).notNull(),
  netWorth: decimal("netWorth", { precision: 15, scale: 2 }).notNull(),
  goalContributions: text("goalContributions").$type<Record<string, number>>(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ---- Investment Allocations ----
export const investmentAllocations = pgTable("investment_allocations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  goalId: integer("goalId"),
  assetClass: assetClassEnum("assetClass").notNull(),
  allocationPercent: decimal("allocationPercent", { precision: 5, scale: 2 }).notNull(),
  recommendedAmount: decimal("recommendedAmount", { precision: 15, scale: 2 }).notNull(),
  expectedReturn: decimal("expectedReturn", { precision: 5, scale: 2 }).notNull(),
  riskLevel: riskLevelEnum("riskLevel").default("moderate"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ---- Asset Holdings ----
export const assetHoldings = pgTable("asset_holdings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  assetClass: assetClassEnum("assetClass").notNull(),
  instrument: varchar("instrument", { length: 255 }).notNull(),
  currentValue: decimal("currentValue", { precision: 15, scale: 2 }).notNull(),
  monthlySip: decimal("monthlySip", { precision: 12, scale: 2 }).default("0"),
  expectedReturn: decimal("expectedReturn", { precision: 5, scale: 2 }).notNull(),
  riskScore: decimal("riskScore", { precision: 4, scale: 2 }).default("5.00"),
  taxTreatment: taxTreatmentEnum("taxTreatment").default("equity_ltcg"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// ---- Tax Profiles ----
export const taxProfiles = pgTable("tax_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  regime: regimeEnum("regime").default("old"),
  section80c: decimal("section80c", { precision: 12, scale: 2 }).default("0"),
  section80dSelf: decimal("section80dSelf", { precision: 12, scale: 2 }).default("0"),
  section80dParents: decimal("section80dParents", { precision: 12, scale: 2 }).default("0"),
  section80ccd1b: decimal("section80ccd1b", { precision: 12, scale: 2 }).default("0"),
  section24b: decimal("section24b", { precision: 12, scale: 2 }).default("0"),
  section80e: decimal("section80e", { precision: 12, scale: 2 }).default("0"),
  section80g: decimal("section80g", { precision: 12, scale: 2 }).default("0"),
  hraExemption: decimal("hraExemption", { precision: 12, scale: 2 }).default("0"),
  ltaClaimed: boolean("ltaClaimed").default(false),
  hasNps: boolean("hasNps").default(false),
  hasPpf: boolean("hasPpf").default(false),
  hasEpf: boolean("hasEpf").default(false),
  hasHealthInsurance: boolean("hasHealthInsurance").default(false),
  parentsSeniorCitizen: boolean("parentsSeniorCitizen").default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// ---- Retirement Models ----
export const retirementModels = pgTable("retirement_models", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  retirementAge: integer("retirementAge").default(60),
  currentMonthlyExpense: decimal("currentMonthlyExpense", { precision: 12, scale: 2 }).default("0"),
  postRetirementExpensePercent: integer("postRetirementExpensePercent").default(70),
  healthcareInflation: decimal("healthcareInflation", { precision: 5, scale: 2 }).default("10.00"),
  lifestyleInflation: decimal("lifestyleInflation", { precision: 5, scale: 2 }).default("6.00"),
  lifeExpectancy: integer("lifeExpectancy").default(85),
  desiredCorpus: decimal("desiredCorpus", { precision: 15, scale: 2 }).default("0"),
  monthlyPension: decimal("monthlyPension", { precision: 12, scale: 2 }).default("0"),
  rentalIncomePostRetirement: decimal("rentalIncomePostRetirement", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// ---- Asset Projections ----
export const assetProjections = pgTable("asset_projections", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  year: integer("year").notNull(),
  assetClass: assetClassEnum("assetClass").notNull(),
  projectedValue: decimal("projectedValue", { precision: 15, scale: 2 }).notNull(),
  contributions: decimal("contributions", { precision: 15, scale: 2 }).default("0"),
  returns: decimal("returns", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ---- Chat Messages ----
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ---- Type Exports ----
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type FinancialProfile = typeof financialProfiles.$inferSelect;
export type InsertFinancialProfile = typeof financialProfiles.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;
export type CashFlowProjection = typeof cashFlowProjections.$inferSelect;
export type InsertCashFlowProjection = typeof cashFlowProjections.$inferInsert;
export type InvestmentAllocation = typeof investmentAllocations.$inferSelect;
export type InsertInvestmentAllocation = typeof investmentAllocations.$inferInsert;
export type AssetHolding = typeof assetHoldings.$inferSelect;
export type InsertAssetHolding = typeof assetHoldings.$inferInsert;
export type TaxProfile = typeof taxProfiles.$inferSelect;
export type InsertTaxProfile = typeof taxProfiles.$inferInsert;
export type RetirementModel = typeof retirementModels.$inferSelect;
export type InsertRetirementModel = typeof retirementModels.$inferInsert;
export type AssetProjection = typeof assetProjections.$inferSelect;
export type InsertAssetProjection = typeof assetProjections.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

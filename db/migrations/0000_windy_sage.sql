CREATE TYPE "public"."asset_class" AS ENUM('equity', 'debt', 'gold', 'real_estate', 'liquid', 'international');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('rent', 'groceries', 'utilities', 'emi', 'insurance', 'entertainment', 'education', 'healthcare', 'transport', 'subscriptions', 'shopping', 'dining', 'other');--> statement-breakpoint
CREATE TYPE "public"."family_relation" AS ENUM('self', 'spouse', 'parent', 'child', 'sibling');--> statement-breakpoint
CREATE TYPE "public"."family_status" AS ENUM('single', 'married', 'married_with_children', 'retired');--> statement-breakpoint
CREATE TYPE "public"."goal_category" AS ENUM('retirement', 'education', 'home', 'vehicle', 'wedding', 'travel', 'emergency', 'wealth', 'other');--> statement-breakpoint
CREATE TYPE "public"."inflation_scenario" AS ENUM('low', 'moderate', 'high');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."regime" AS ENUM('old', 'new');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('conservative', 'moderate', 'aggressive');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tax_treatment" AS ENUM('equity_ltcg', 'debt_interest', 'debt_ltcg', 'gold_ltcg', 'real_estate_ltcg', 'tax_free', 'epf_tax_deferred');--> statement-breakpoint
CREATE TYPE "public"."txn_frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."txn_type" AS ENUM('sip', 'emi', 'subscription', 'insurance', 'rent', 'other');--> statement-breakpoint
CREATE TABLE "asset_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"assetClass" "asset_class" NOT NULL,
	"instrument" varchar(255) NOT NULL,
	"currentValue" numeric(15, 2) NOT NULL,
	"monthlySip" numeric(12, 2) DEFAULT '0',
	"expectedReturn" numeric(5, 2) NOT NULL,
	"riskScore" numeric(4, 2) DEFAULT '5.00',
	"taxTreatment" "tax_treatment" DEFAULT 'equity_ltcg',
	"schemeCode" varchar(20),
	"units" numeric(18, 4),
	"navDate" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_projections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"year" integer NOT NULL,
	"assetClass" "asset_class" NOT NULL,
	"projectedValue" numeric(15, 2) NOT NULL,
	"contributions" numeric(15, 2) DEFAULT '0',
	"returns" numeric(15, 2) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_flow_projections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"year" integer NOT NULL,
	"age" integer,
	"income" numeric(15, 2) NOT NULL,
	"expenses" numeric(15, 2) NOT NULL,
	"savings" numeric(15, 2) NOT NULL,
	"investments" numeric(15, 2) NOT NULL,
	"netWorth" numeric(15, 2) NOT NULL,
	"goalContributions" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_breakdown" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"month" varchar(7) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"relation" "family_relation" NOT NULL,
	"age" integer,
	"monthlyIncome" numeric(15, 2) DEFAULT '0',
	"monthlyExpenses" numeric(15, 2) DEFAULT '0',
	"totalAssets" numeric(15, 2) DEFAULT '0',
	"totalLiabilities" numeric(15, 2) DEFAULT '0',
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"monthlyIncome" numeric(15, 2) NOT NULL,
	"monthlyExpenses" numeric(15, 2) NOT NULL,
	"emergencyFund" numeric(15, 2) DEFAULT '0',
	"totalAssets" numeric(15, 2) DEFAULT '0',
	"totalLiabilities" numeric(15, 2) DEFAULT '0',
	"equityInvestments" numeric(15, 2) DEFAULT '0',
	"debtInvestments" numeric(15, 2) DEFAULT '0',
	"realEstate" numeric(15, 2) DEFAULT '0',
	"gold" numeric(15, 2) DEFAULT '0',
	"otherAssets" numeric(15, 2) DEFAULT '0',
	"inflationScenario" "inflation_scenario" DEFAULT 'moderate',
	"planningHorizon" integer DEFAULT 30,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financial_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "goal_category" NOT NULL,
	"targetAmount" numeric(15, 2) NOT NULL,
	"currentAmount" numeric(15, 2) DEFAULT '0',
	"timelineYears" integer NOT NULL,
	"priority" "priority" DEFAULT 'medium',
	"description" text,
	"monthlyContribution" numeric(15, 2) DEFAULT '0',
	"expectedReturn" numeric(5, 2) DEFAULT '8.00',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"goalId" integer,
	"assetClass" "asset_class" NOT NULL,
	"allocationPercent" numeric(5, 2) NOT NULL,
	"recommendedAmount" numeric(15, 2) NOT NULL,
	"expectedReturn" numeric(5, 2) NOT NULL,
	"riskLevel" "risk_level" DEFAULT 'moderate',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"name" varchar(255),
	"securityQuestion" varchar(500),
	"securityAnswerHash" varchar(255),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "local_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "txn_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"frequency" "txn_frequency" DEFAULT 'monthly' NOT NULL,
	"dueDay" integer NOT NULL,
	"startDate" varchar(10) NOT NULL,
	"endDate" varchar(10),
	"autoPay" boolean DEFAULT false,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retirement_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"retirementAge" integer DEFAULT 60,
	"currentMonthlyExpense" numeric(12, 2) DEFAULT '0',
	"postRetirementExpensePercent" integer DEFAULT 70,
	"healthcareInflation" numeric(5, 2) DEFAULT '10.00',
	"lifestyleInflation" numeric(5, 2) DEFAULT '6.00',
	"lifeExpectancy" integer DEFAULT 85,
	"desiredCorpus" numeric(15, 2) DEFAULT '0',
	"monthlyPension" numeric(12, 2) DEFAULT '0',
	"rentalIncomePostRetirement" numeric(12, 2) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "retirement_models_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "tax_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"regime" "regime" DEFAULT 'old',
	"section80c" numeric(12, 2) DEFAULT '0',
	"section80dSelf" numeric(12, 2) DEFAULT '0',
	"section80dParents" numeric(12, 2) DEFAULT '0',
	"section80ccd1b" numeric(12, 2) DEFAULT '0',
	"section24b" numeric(12, 2) DEFAULT '0',
	"section80e" numeric(12, 2) DEFAULT '0',
	"section80g" numeric(12, 2) DEFAULT '0',
	"hraExemption" numeric(12, 2) DEFAULT '0',
	"ltaClaimed" boolean DEFAULT false,
	"hasNps" boolean DEFAULT false,
	"hasPpf" boolean DEFAULT false,
	"hasEpf" boolean DEFAULT false,
	"hasHealthInsurance" boolean DEFAULT false,
	"parentsSeniorCitizen" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tax_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"age" integer NOT NULL,
	"profession" varchar(255),
	"familyStatus" "family_status" DEFAULT 'single',
	"dependents" integer DEFAULT 0,
	"city" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"unionId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_unionId_unique" UNIQUE("unionId")
);

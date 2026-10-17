CREATE TABLE "net_worth_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"date" varchar(10) NOT NULL,
	"totalAssets" numeric(15, 2) NOT NULL,
	"totalLiabilities" numeric(15, 2) NOT NULL,
	"netWorth" numeric(15, 2) NOT NULL,
	"breakdown" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "net_worth_snapshots_user_date_idx" ON "net_worth_snapshots" USING btree ("userId","date");
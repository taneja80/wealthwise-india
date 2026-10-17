ALTER TABLE "asset_holdings" ADD COLUMN "ticker" varchar(40);--> statement-breakpoint
ALTER TABLE "asset_holdings" ADD COLUMN "lastPrice" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "asset_holdings" ADD COLUMN "priceCurrency" varchar(8);--> statement-breakpoint
ALTER TABLE "asset_holdings" ADD COLUMN "priceDate" varchar(20);
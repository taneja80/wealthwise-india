import { authRouter } from "./auth-router";
import { localAuthRouter } from "./local-auth-router";
import { profileRouter } from "./profile-router";
import { goalsRouter } from "./goals-router";
import { cashFlowRouter } from "./cashflow-router";
import { allocationRouter } from "./allocation-router";
import { chatRouter } from "./chat-router";
import { taxRouter } from "./tax-router";
import { retirementRouter } from "./retirement-router";
import { assetRouter } from "./asset-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  profile: profileRouter,
  goals: goalsRouter,
  cashFlow: cashFlowRouter,
  allocation: allocationRouter,
  chat: chatRouter,
  tax: taxRouter,
  retirement: retirementRouter,
  asset: assetRouter,
});

export type AppRouter = typeof appRouter;

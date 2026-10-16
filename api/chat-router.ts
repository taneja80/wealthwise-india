import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatMessages, userProfiles, financialProfiles, goals as goalsTable, assetHoldings } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { enforceRateLimit, RateLimits } from "./lib/rate-limit";
import { env } from "./lib/env";

function buildFinancialContext(
  profile: { age: number; profession: string | null; familyStatus: string | null; dependents: number | null } | undefined,
  financial: { monthlyIncome: string; monthlyExpenses: string; emergencyFund: string | null; totalAssets: string | null; totalLiabilities: string | null; inflationScenario: string | null; planningHorizon: number | null } | undefined,
  userGoals: Array<{ name: string; category: string; targetAmount: string; currentAmount: string | null; timelineYears: number; monthlyContribution: string | null; expectedReturn: string | null }>,
  holdings: Array<{ assetClass: string; instrument: string; currentValue: string; monthlySip: string | null }>,
): string {
  if (!profile && !financial && userGoals.length === 0 && holdings.length === 0) {
    return "";
  }

  const parts: string[] = ["\n\n--- USER'S FINANCIAL CONTEXT (use this to personalize advice) ---"];

  if (profile) {
    parts.push(`Profile: ${profile.age} years old, ${profile.profession ?? "not specified"}, ${profile.familyStatus ?? "single"}, ${profile.dependents ?? 0} dependents.`);
  }

  if (financial) {
    const income = Number(financial.monthlyIncome);
    const expenses = Number(financial.monthlyExpenses);
    const netWorth = Number(financial.totalAssets ?? 0) - Number(financial.totalLiabilities ?? 0);
    const savings = income - expenses;
    parts.push(`Finances: ₹${income.toLocaleString("en-IN")}/mo income, ₹${expenses.toLocaleString("en-IN")}/mo expenses, ₹${savings.toLocaleString("en-IN")}/mo savings (${income > 0 ? Math.round((savings / income) * 100) : 0}% rate). Net worth: ₹${netWorth.toLocaleString("en-IN")}. Emergency fund: ₹${Number(financial.emergencyFund ?? 0).toLocaleString("en-IN")}. Inflation assumption: ${financial.inflationScenario ?? "moderate"}. Planning horizon: ${financial.planningHorizon ?? 30} years.`);
  }

  if (userGoals.length > 0) {
    const goalLines = userGoals.map((g) => {
      const progress = Number(g.targetAmount) > 0 ? Math.round((Number(g.currentAmount ?? 0) / Number(g.targetAmount)) * 100) : 0;
      return `  - ${g.name} (${g.category}): ₹${Number(g.currentAmount ?? 0).toLocaleString("en-IN")} / ₹${Number(g.targetAmount).toLocaleString("en-IN")} (${progress}%), ${g.timelineYears}y, SIP ₹${Number(g.monthlyContribution ?? 0).toLocaleString("en-IN")}/mo`;
    });
    parts.push(`Goals (${userGoals.length}):\n${goalLines.join("\n")}`);
  }

  if (holdings.length > 0) {
    const totalValue = holdings.reduce((s, h) => s + Number(h.currentValue), 0);
    const totalSip = holdings.reduce((s, h) => s + Number(h.monthlySip ?? 0), 0);
    const byClass: Record<string, number> = {};
    for (const h of holdings) {
      byClass[h.assetClass] = (byClass[h.assetClass] ?? 0) + Number(h.currentValue);
    }
    const allocStr = Object.entries(byClass)
      .map(([cls, val]) => `${cls}: ₹${val.toLocaleString("en-IN")} (${totalValue > 0 ? Math.round((val / totalValue) * 100) : 0}%)`)
      .join(", ");
    parts.push(`Portfolio: ₹${totalValue.toLocaleString("en-IN")} total, ₹${totalSip.toLocaleString("en-IN")}/mo SIP. Allocation: ${allocStr}. ${holdings.length} holdings.`);
  }

  parts.push("--- END CONTEXT ---");
  return parts.join("\n");
}

export const chatRouter = createRouter({
  getHistory: authedQuery
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }).default({ limit: 50, offset: 0 }),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();

      // Get total count for pagination metadata
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(eq(chatMessages.userId, ctx.user.id));
      const total = Number(countResult[0]?.count ?? 0);

      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, ctx.user.id),
        orderBy: (chatMessages, { asc }) => [asc(chatMessages.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return {
        messages,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  send: authedQuery
    .input(z.object({ message: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit chat messages
      enforceRateLimit(ctx, "chat", RateLimits.chat);

      const db = getDb();
      const history = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, ctx.user.id),
        orderBy: (chatMessages, { desc }) => [desc(chatMessages.createdAt)],
        limit: 10,
      });

      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "user",
        content: input.message,
      });

      // Fetch user's financial data for context-aware advice
      const [profile, financial, userGoals, holdings] = await Promise.all([
        db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, ctx.user.id) }),
        db.query.financialProfiles.findFirst({ where: eq(financialProfiles.userId, ctx.user.id) }),
        db.query.goals.findMany({ where: eq(goalsTable.userId, ctx.user.id) }),
        db.query.assetHoldings.findMany({ where: eq(assetHoldings.userId, ctx.user.id) }),
      ]);

      const financialContext = buildFinancialContext(profile, financial, userGoals, holdings);

      const systemPrompt = `You are WealthWise, a professional financial planning advisor specialized in Indian personal finance. You provide advice on:
- Goal-based financial planning (retirement, education, home buying, etc.)
- Asset allocation across Indian investment options (equity mutual funds, debt funds, PPF, NPS, gold, real estate)
- Tax planning under Indian tax regime
- Cash flow management and budgeting
- Risk assessment and emergency planning
- SIP and lump sum investment strategies

Be concise, practical, and culturally aware of Indian financial context. Use rupee amounts where relevant. Suggest specific fund categories or instruments when appropriate. Keep responses under 200 words.

When the user's financial context is provided below, use it to give personalized, specific advice. Reference their actual numbers, goals, and portfolio when relevant. If they ask general questions, still give general answers but relate it to their situation when helpful.${financialContext}`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...history.reverse().map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: input.message },
      ];

      try {
        // Use Ollama (local open-source LLM) with OpenAI-compatible API
        const response = await fetch(`${env.ollamaUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: env.ollamaModel,
            messages,
            temperature: 0.7,
            max_tokens: 500,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`Ollama returned ${response.status}`);
        }

        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const assistantMessage = data.choices?.[0]?.message?.content ??
          "I'm sorry, I couldn't generate a response at the moment. Please try again.";

        await db.insert(chatMessages).values({
          userId: ctx.user.id,
          role: "assistant",
          content: assistantMessage,
        });

        return { response: assistantMessage };
      } catch (error) {
        console.error("[chat] LLM service error:", error instanceof Error ? error.message : error);

        const fallbackResponse =
          "I'm temporarily unable to respond. Make sure Ollama is running locally (ollama serve) with a model pulled (e.g. ollama pull llama3.2).";

        // Don't persist fallback messages to avoid DB bloat
        return { response: fallbackResponse };
      }
    }),
});

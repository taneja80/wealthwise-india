import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatMessages } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { enforceRateLimit, RateLimits } from "./lib/rate-limit";

export const chatRouter = createRouter({
  getHistory: authedQuery
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }).default({}),
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
      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "user",
        content: input.message,
      });

      const history = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, ctx.user.id),
        orderBy: (chatMessages, { desc }) => [desc(chatMessages.createdAt)],
        limit: 10,
      });

      const systemPrompt = `You are WealthWise, a professional financial planning advisor specialized in Indian personal finance. You provide advice on:
- Goal-based financial planning (retirement, education, home buying, etc.)
- Asset allocation across Indian investment options (equity mutual funds, debt funds, PPF, NPS, gold, real estate)
- Tax planning under Indian tax regime
- Cash flow management and budgeting
- Risk assessment and emergency planning
- SIP and lump sum investment strategies

Be concise, practical, and culturally aware of Indian financial context. Use rupee amounts where relevant. Suggest specific fund categories or instruments when appropriate. Keep responses under 200 words.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...history.reverse().map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: input.message },
      ];

      try {
        const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MOONSHOT_API_KEY ?? ""}`,
          },
          body: JSON.stringify({
            model: "kimi-latest",
            messages,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          throw new Error("AI service unavailable");
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
        console.error("[chat] AI service error:", error instanceof Error ? error.message : error);

        const fallbackResponse = "I'm temporarily unable to respond. Please try again in a moment.";

        // Don't persist fallback messages to avoid DB bloat
        return { response: fallbackResponse };
      }
    }),
});

import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatMessages } from "@db/schema";
import { eq } from "drizzle-orm";

export const chatRouter = createRouter({
  getHistory: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, ctx.user.id),
      orderBy: (chatMessages, { asc }) => [asc(chatMessages.createdAt)],
      limit: 50,
    });
  }),

  send: authedQuery
    .input(z.object({ message: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
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
        const fallbackResponse = `I apologize, but I'm currently unable to connect to my knowledge base. As a quick tip: For your financial goals, consider the 50-30-20 rule - allocate 50% of income to needs, 30% to wants, and 20% to savings and investments. In India, starting a monthly SIP in an index fund like Nifty 50 can be a great foundation for long-term wealth creation. Please try your question again in a moment.`;

        await db.insert(chatMessages).values({
          userId: ctx.user.id,
          role: "assistant",
          content: fallbackResponse,
        });

        return { response: fallbackResponse };
      }
    }),
});

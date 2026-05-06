import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { localUsers } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "wealthwise-local-auth-secret-key-2024"
);

async function createToken(userId: number, email: string, role: string) {
  return new SignJWT({ userId, email, role, type: "local" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyLocalToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    return payload as { userId: number; email: string; role: string; type: string };
  } catch {
    return null;
  }
}

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: z.string().email().max(320),
        password: z.string().min(6).max(100),
        name: z.string().min(1).max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.query.localUsers.findFirst({
        where: eq(localUsers.email, input.email),
      });
      if (existing) {
        return { success: false, error: "An account with this email already exists" };
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(localUsers).values({
        email: input.email,
        passwordHash,
        name: input.name || input.email.split("@")[0],
      });
      const userId = Number((result as any).insertId);
      const token = await createToken(userId, input.email, "user");
      return { success: true, token, user: { id: userId, email: input.email, name: input.name || input.email.split("@")[0] } };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.localUsers.findFirst({
        where: eq(localUsers.email, input.email),
      });
      if (!user) {
        return { success: false, error: "Invalid email or password" };
      }
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        return { success: false, error: "Invalid email or password" };
      }
      await db.update(localUsers).set({ lastSignInAt: new Date() }).where(eq(localUsers.id, user.id));
      const token = await createToken(user.id, user.email, user.role);
      return {
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const authHeader = ctx.req.headers.get("x-local-auth-token");
    if (!authHeader) return null;
    const payload = await verifyLocalToken(authHeader);
    if (!payload) return null;
    const db = getDb();
    const user = await db.query.localUsers.findFirst({
      where: eq(localUsers.id, payload.userId),
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: null,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
    };
  }),
});

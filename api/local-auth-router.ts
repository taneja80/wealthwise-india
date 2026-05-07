import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { localUsers } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import * as cookie from "cookie";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { LocalSession } from "@contracts/constants";
import { enforceRateLimit, RateLimits } from "./lib/rate-limit";
import { strongPassword } from "./lib/validation";

const getJwtSecret = () => new TextEncoder().encode(env.jwtSecret);

async function createToken(userId: number, email: string, role: string) {
  return new SignJWT({ userId, email, role, type: "local" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifyLocalToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { clockTolerance: 60 });
    return payload as { userId: number; email: string; role: string; type: string };
  } catch {
    return null;
  }
}

function setLocalAuthCookie(resHeaders: Headers, reqHeaders: Headers, token: string) {
  const opts = getSessionCookieOptions(reqHeaders);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(LocalSession.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: LocalSession.maxAgeMs / 1000,
    }),
  );
}

function clearLocalAuthCookie(resHeaders: Headers, reqHeaders: Headers) {
  const opts = getSessionCookieOptions(reqHeaders);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(LocalSession.cookieName, "", {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: 0,
    }),
  );
}

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: z.string().email().max(320),
        password: strongPassword,
        name: z.string().min(1).max(255).optional(),
        securityQuestion: z.string().min(5).max(500),
        securityAnswer: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ input, ctx }) => {
      enforceRateLimit(ctx, "auth", RateLimits.auth);

      const db = getDb();
      const existing = await db.query.localUsers.findFirst({
        where: eq(localUsers.email, input.email),
      });
      if (existing) {
        return { success: false, error: "An account with this email already exists" };
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const securityAnswerHash = await bcrypt.hash(input.securityAnswer.toLowerCase().trim(), 10);
      const result = await db.insert(localUsers).values({
        email: input.email,
        passwordHash,
        name: input.name || input.email.split("@")[0],
        securityQuestion: input.securityQuestion,
        securityAnswerHash,
      });
      const userId = Number((result as any).insertId);
      const token = await createToken(userId, input.email, "user");
      setLocalAuthCookie(ctx.resHeaders, ctx.req.headers, token);
      return { success: true, user: { id: userId, email: input.email, name: input.name || input.email.split("@")[0] } };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      enforceRateLimit(ctx, "auth", RateLimits.auth);

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
      setLocalAuthCookie(ctx.resHeaders, ctx.req.headers, token);
      return {
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const cookies = cookie.parse(ctx.req.headers.get("cookie") || "");
    const token = cookies[LocalSession.cookieName];
    if (!token) return null;
    const payload = await verifyLocalToken(token);
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

  logout: publicQuery.mutation(async ({ ctx }) => {
    clearLocalAuthCookie(ctx.resHeaders, ctx.req.headers);
    return { success: true };
  }),

  /** Get the security question for an email (for forgot password flow) */
  getSecurityQuestion: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      enforceRateLimit(ctx, "auth", RateLimits.auth);
      const db = getDb();
      const user = await db.query.localUsers.findFirst({
        where: eq(localUsers.email, input.email),
      });
      if (!user || !user.securityQuestion) {
        return { success: false, error: "No account found with this email or no security question set" };
      }
      return { success: true, securityQuestion: user.securityQuestion };
    }),

  /** Verify security answer and reset password */
  resetPassword: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        securityAnswer: z.string().min(1),
        newPassword: strongPassword,
      })
    )
    .mutation(async ({ input, ctx }) => {
      enforceRateLimit(ctx, "auth", RateLimits.auth);
      const db = getDb();
      const user = await db.query.localUsers.findFirst({
        where: eq(localUsers.email, input.email),
      });
      if (!user || !user.securityAnswerHash) {
        return { success: false, error: "Invalid email or security question not set" };
      }
      const valid = await bcrypt.compare(input.securityAnswer.toLowerCase().trim(), user.securityAnswerHash);
      if (!valid) {
        return { success: false, error: "Incorrect security answer" };
      }
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.update(localUsers).set({ passwordHash: newHash }).where(eq(localUsers.id, user.id));
      return { success: true };
    }),
});

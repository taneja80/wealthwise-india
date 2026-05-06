import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { authenticateRequest } from "./kimi/auth";
import { verifyLocalToken } from "./local-auth-router";
import { getDb } from "./queries/connection";
import { localUsers } from "@db/schema";
import { eq } from "drizzle-orm";

// Local user IDs are offset by this amount to avoid collisions with OAuth user IDs
export const LOCAL_USER_OFFSET = 10_000_000;

export type UnifiedUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatar?: string | null;
  role: string;
  unionId?: string;
  source: "oauth" | "local";
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: UnifiedUser;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  // Try OAuth first
  try {
    const oauthUser = await authenticateRequest(opts.req.headers);
    if (oauthUser) {
      ctx.user = {
        id: oauthUser.id,
        name: oauthUser.name,
        email: oauthUser.email ?? null,
        avatar: oauthUser.avatar,
        role: oauthUser.role,
        unionId: oauthUser.unionId,
        source: "oauth",
      };
      return ctx;
    }
  } catch {
    // OAuth not available
  }

  // Try local auth
  try {
    const localToken = opts.req.headers.get("x-local-auth-token");
    if (localToken) {
      const payload = await verifyLocalToken(localToken);
      if (payload) {
        const db = getDb();
        const rows = await db.select().from(localUsers).where(eq(localUsers.id, payload.userId)).limit(1);
        if (rows.length > 0) {
          const u = rows[0];
          ctx.user = {
            id: u.id + LOCAL_USER_OFFSET,
            name: u.name,
            email: u.email,
            role: u.role,
            source: "local",
          };
        }
      }
    }
  } catch {
    // Local auth not available
  }

  return ctx;
}

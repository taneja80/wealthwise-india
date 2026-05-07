import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { authenticateRequest } from "./kimi/auth";
import { verifyLocalToken } from "./local-auth-router";
import { getDb } from "./queries/connection";
import { localUsers } from "@db/schema";
import { LocalSession } from "@contracts/constants";
import { eq } from "drizzle-orm";
import * as cookie from "cookie";

// Local user IDs are offset by this amount to avoid collisions with OAuth user IDs
export const LOCAL_USER_OFFSET = 10_000_000;
// If a local user ID reaches this threshold, we must migrate to UUIDs
const LOCAL_USER_ID_SAFE_MAX = LOCAL_USER_OFFSET - 1;

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

  // Try local auth (from httpOnly cookie)
  try {
    const cookies = cookie.parse(opts.req.headers.get("cookie") || "");
    const localToken = cookies[LocalSession.cookieName];
    if (localToken) {
      const payload = await verifyLocalToken(localToken);
      if (payload) {
        const db = getDb();
        const rows = await db.select().from(localUsers).where(eq(localUsers.id, payload.userId)).limit(1);
        if (rows.length > 0) {
          const u = rows[0];
          if (u.id >= LOCAL_USER_ID_SAFE_MAX) {
            throw new Error(
              `Local user ID ${u.id} exceeds safe threshold ${LOCAL_USER_ID_SAFE_MAX}. ` +
              `Migrate to UUIDs to prevent ID collisions with OAuth users.`
            );
          }
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
  } catch (e) {
    if (e instanceof Error && e.message.includes("exceeds safe threshold")) {
      throw e; // Re-throw collision errors — these are critical
    }
    // Local auth not available
  }

  return ctx;
}

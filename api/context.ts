import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyLocalToken } from "./local-auth-router";
import { getDb } from "./queries/connection";
import { localUsers } from "@db/schema";
import { LocalSession } from "@contracts/constants";
import { eq } from "drizzle-orm";
import * as cookie from "cookie";

export type UnifiedUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatar?: string | null;
  role: string;
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

  // Authenticate via local auth (httpOnly cookie)
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
          ctx.user = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
          };
        }
      }
    }
  } catch {
    // Local auth not available
  }

  return ctx;
}

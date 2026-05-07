import { describe, it, expect } from "vitest";
import { getSessionCookieOptions } from "./cookies";

function makeHeaders(host: string): Headers {
  const h = new Headers();
  h.set("host", host);
  return h;
}

describe("getSessionCookieOptions", () => {
  it("returns Lax sameSite and insecure for localhost", () => {
    const opts = getSessionCookieOptions(makeHeaders("localhost:3000"));
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("Lax");
    expect(opts.secure).toBe(false);
    expect(opts.path).toBe("/");
  });

  it("returns Lax sameSite for 127.0.0.1", () => {
    const opts = getSessionCookieOptions(makeHeaders("127.0.0.1:5173"));
    expect(opts.sameSite).toBe("Lax");
    expect(opts.secure).toBe(false);
  });

  it("returns None sameSite and secure for production host", () => {
    const opts = getSessionCookieOptions(makeHeaders("wealthwise.onrender.com"));
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("None");
    expect(opts.secure).toBe(true);
    expect(opts.path).toBe("/");
  });

  it("returns None sameSite for a custom domain", () => {
    const opts = getSessionCookieOptions(makeHeaders("api.wealthwise.in"));
    expect(opts.sameSite).toBe("None");
    expect(opts.secure).toBe(true);
  });

  it("handles empty host header as non-localhost", () => {
    const opts = getSessionCookieOptions(new Headers());
    expect(opts.sameSite).toBe("None");
    expect(opts.secure).toBe(true);
  });
});

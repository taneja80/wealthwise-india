import { describe, it, expect } from "vitest";
import { Errors } from "./errors";
import type { AppError } from "./errors";
import { Session, LocalSession, OAuthState, ErrorMessages, Paths } from "./constants";

describe("Errors", () => {
  it("creates a badRequest error with status 400", () => {
    const err = Errors.badRequest("invalid input");
    expect(err).toEqual<AppError>({
      tag: "app_error",
      status: 400,
      message: "invalid input",
    });
  });

  it("creates an unauthorized error with status 401", () => {
    const err = Errors.unauthorized("no token");
    expect(err).toEqual<AppError>({
      tag: "app_error",
      status: 401,
      message: "no token",
    });
  });

  it("creates a forbidden error with status 403", () => {
    const err = Errors.forbidden("access denied");
    expect(err).toEqual<AppError>({
      tag: "app_error",
      status: 403,
      message: "access denied",
    });
  });

  it("creates a notFound error with status 404", () => {
    const err = Errors.notFound("resource missing");
    expect(err).toEqual<AppError>({
      tag: "app_error",
      status: 404,
      message: "resource missing",
    });
  });

  it("creates an internal error with status 500", () => {
    const err = Errors.internal("server crash");
    expect(err).toEqual<AppError>({
      tag: "app_error",
      status: 500,
      message: "server crash",
    });
  });

  it("all errors have 'app_error' tag", () => {
    const errors = [
      Errors.badRequest("test"),
      Errors.unauthorized("test"),
      Errors.forbidden("test"),
      Errors.notFound("test"),
      Errors.internal("test"),
    ];
    for (const err of errors) {
      expect(err.tag).toBe("app_error");
    }
  });
});

describe("Constants", () => {
  describe("Session", () => {
    it("has correct cookie name", () => {
      expect(Session.cookieName).toBe("kimi_sid");
    });

    it("has 1 year max age", () => {
      expect(Session.maxAgeMs).toBe(365 * 24 * 60 * 60 * 1000);
    });
  });

  describe("LocalSession", () => {
    it("has correct cookie name", () => {
      expect(LocalSession.cookieName).toBe("local_sid");
    });

    it("has 30 day max age", () => {
      expect(LocalSession.maxAgeMs).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe("OAuthState", () => {
    it("has correct cookie name", () => {
      expect(OAuthState.cookieName).toBe("oauth_state");
    });

    it("has 10 minute max age", () => {
      expect(OAuthState.maxAgeMs).toBe(10 * 60 * 1000);
    });
  });

  describe("ErrorMessages", () => {
    it("has expected messages", () => {
      expect(ErrorMessages.unauthenticated).toBe("Authentication required");
      expect(ErrorMessages.insufficientRole).toBe("Insufficient permissions");
    });
  });

  describe("Paths", () => {
    it("has correct paths", () => {
      expect(Paths.login).toBe("/login");
      expect(Paths.oauthCallback).toBe("/api/oauth/callback");
    });
  });
});

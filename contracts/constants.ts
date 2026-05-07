export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const LocalSession = {
  cookieName: "local_sid",
  maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

export const OAuthState = {
  cookieName: "oauth_state",
  maxAgeMs: 10 * 60 * 1000, // 10 minutes
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

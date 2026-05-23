export const LocalSession = {
  cookieName: "local_sid",
  maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
} as const;

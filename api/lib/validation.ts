import { z } from "zod";

/**
 * A safe decimal number schema that rejects NaN, Infinity, and -Infinity.
 * Use this for all monetary / percentage inputs that will be stored as decimal strings.
 */
export function safeDecimal(opts?: { min?: number; max?: number }) {
  let schema = z.number().refine(
    (v) => Number.isFinite(v),
    { message: "Value must be a finite number" },
  );
  if (opts?.min !== undefined) {
    const min = opts.min;
    schema = schema.refine((v) => v >= min, { message: `Value must be at least ${min}` });
  }
  if (opts?.max !== undefined) {
    const max = opts.max;
    schema = schema.refine((v) => v <= max, { message: `Value must be at most ${max}` });
  }
  return schema;
}

/**
 * Password validation schema with strength requirements.
 * Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character.
 */
export const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be at most 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

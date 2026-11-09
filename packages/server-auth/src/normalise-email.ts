import { z } from "zod";

const emailSchema = z.email().max(254);

/** The address trimmed and in lower case, or null when it is not an email address. */
export function normaliseEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return emailSchema.safeParse(email).success ? email : null;
}

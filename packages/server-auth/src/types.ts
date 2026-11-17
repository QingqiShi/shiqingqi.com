import type { AuthLocale } from "./auth-bodies.ts";

/** What the email of a code holds: the code, and its link when the flow has one. */
export type CodeEmailInput = {
  to: string;
  locale: AuthLocale;
  code: string;
} & (
  | { url: string; reason: "recovery" | "sign-up" | "registered-sign-up" }
  | { reason: "email-change" }
);

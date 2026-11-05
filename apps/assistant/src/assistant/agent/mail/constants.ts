import { z } from "zod";

export const SEEN = "\\Seen";
export const FLAGGED = "\\Flagged";
const MAX_REASON_CHARS = 300;

export const accountKey = z
  .string()
  .describe('An account key from list_accounts, such as "a1".');
export const mailIds = (max: number) =>
  z
    .array(z.string())
    .min(1)
    .max(max)
    .describe('Mail ids from list_mail in this run, such as "m12".');
export const reason = z
  .string()
  .trim()
  .min(1)
  .max(MAX_REASON_CHARS)
  .describe("Why, in one short line for the owner's activity log.");

import { z } from "zod";
import { normaliseEmail } from "../email/normalise-email.ts";
import type { BuddyEmail, BuddyEmailSender } from "../email/types.ts";
import {
  buddyEmailCodeCookie,
  type EmailCodePayload,
} from "./buddy-email-code-cookie.ts";
import { hashToken } from "./hash-token.ts";
import {
  HttpError,
  localeSchema,
  readBody,
  type Context,
} from "./make-auth-route-kit.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { checkEmailCode, normaliseEmailCode } from "./start-email-code.ts";

export const codeBody = z.object({ code: z.string().max(20) });

const emailBody = z.object({
  email: z.string().max(320),
  locale: localeSchema,
});

export function issueEmailCode(context: Context, payload: EmailCodePayload) {
  context.setCookies.push(
    buddyEmailCodeCookie.serialize(
      buddyEmailCodeCookie.seal(payload, context.secret, context.now),
      context.secure,
    ),
  );
}

/**
 * Checks a typed code against the emailed code that this browser asked
 * for, and returns the address it went to. A code that has ended clears
 * the cookie, so that the browser asks for a new one.
 */
export async function takeEmailCode(
  request: Request,
  context: Context,
  purpose: EmailCodePayload["purpose"],
  typed: string,
): Promise<string> {
  const value = readRequestCookie(request, buddyEmailCodeCookie.name);
  const payload = value
    ? buddyEmailCodeCookie.open(value, context.secret, context.now)
    : null;
  if (payload?.purpose !== purpose) {
    context.setCookies.push(buddyEmailCodeCookie.clear(context.secure));
    throw new HttpError(410, "code_expired");
  }
  const code = normaliseEmailCode(typed);
  if (!code) throw new HttpError(400, "code_invalid");
  const result = await checkEmailCode(context.db, {
    purpose,
    codeId: payload.codeId,
    code,
    now: context.now,
  });
  if (!result.ok && !result.ended) throw new HttpError(400, "code_invalid");
  context.setCookies.push(buddyEmailCodeCookie.clear(context.secure));
  if (!result.ok) throw new HttpError(410, "code_expired");
  return result.email;
}

export async function sendOrFail(sender: BuddyEmailSender, email: BuddyEmail) {
  try {
    await sender.send(email);
  } catch (error) {
    console.error(`Buddy email "${email.subject}" failed:`, error);
    throw new HttpError(502, "email_failed");
  }
}

export async function readEmail(request: Request) {
  const body = await readBody(request, emailBody);
  const email = normaliseEmail(body.email);
  if (!email) throw new HttpError(400, "email_invalid");
  return { email, locale: body.locale };
}

export function hashedAddress(email: string) {
  return Buffer.from(hashToken(email)).toString("hex");
}

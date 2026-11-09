import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import {
  financeChallengeCookie,
  type ChallengePayload,
} from "./finance-challenge-cookie.ts";
import { HttpError, type Context } from "./make-auth-route-kit.ts";

function hasPurpose<P extends ChallengePayload["purpose"]>(
  payload: ChallengePayload,
  purpose: P,
): payload is Extract<ChallengePayload, { purpose: P }> {
  return payload.purpose === purpose;
}

export function issueChallenge(context: Context, payload: ChallengePayload) {
  context.setCookies.push(
    financeChallengeCookie.serialize(
      financeChallengeCookie.seal(payload, context.secret, context.now),
      context.secure,
    ),
  );
}

export function takeChallenge<P extends ChallengePayload["purpose"]>(
  request: Request,
  context: Context,
  purpose: P,
): Extract<ChallengePayload, { purpose: P }> {
  context.setCookies.push(financeChallengeCookie.clear(context.secure));
  const value = readRequestCookie(request, financeChallengeCookie.name);
  const payload = value
    ? financeChallengeCookie.open(value, context.secret, context.now)
    : null;
  if (!payload || !hasPurpose(payload, purpose)) {
    throw new HttpError(400, "challenge_invalid");
  }
  return payload;
}

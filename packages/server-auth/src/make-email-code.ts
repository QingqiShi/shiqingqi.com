import { HttpError } from "./http-error.ts";
import type { AuthContext } from "./make-auth-route-kit.ts";
import type { AuthStore, AuthTx, EmailCodePurpose } from "./make-auth-store.ts";
import type {
  EmailCodePayload,
  makeEmailCodeCookie,
} from "./make-email-code-cookie.ts";
import { normaliseEmailCode } from "./normalise-email-code.ts";
import { readRequestCookie } from "./read-request-cookie.ts";

/**
 * The emailed code of a flow, bound by a sealed cookie to the browser that
 * asked for it.
 */
export function makeEmailCode<Db>({
  cookie,
  store,
  transaction,
}: {
  cookie: ReturnType<typeof makeEmailCodeCookie>;
  store: AuthStore;
  transaction: <T>(db: Db, run: (tx: AuthTx) => Promise<T>) => Promise<T>;
}) {
  return {
    issue(context: AuthContext<Db>, payload: EmailCodePayload) {
      context.setCookies.push(
        cookie.serialize(
          cookie.seal(payload, context.secret, context.now),
          context.secure,
        ),
      );
    },

    /**
     * Checks a typed code against the emailed code that this browser asked
     * for, and returns the address it went to. A code that has ended clears
     * the cookie, so that the browser asks for a new one.
     */
    async take(
      request: Request,
      context: AuthContext<Db>,
      purpose: EmailCodePurpose,
      typed: string,
    ): Promise<string> {
      const value = readRequestCookie(request, cookie.name);
      const payload = value
        ? cookie.open(value, context.secret, context.now)
        : null;
      if (payload?.purpose !== purpose) {
        context.setCookies.push(cookie.clear(context.secure));
        throw new HttpError(410, "code_expired");
      }
      const code = normaliseEmailCode(typed);
      if (!code) throw new HttpError(400, "code_invalid");
      const result = await transaction(context.db, (tx) =>
        store.checkEmailCode(tx, {
          purpose,
          codeId: payload.codeId,
          code,
          now: context.now,
        }),
      );
      if (!result.ok && !result.ended) throw new HttpError(400, "code_invalid");
      context.setCookies.push(cookie.clear(context.secure));
      if (!result.ok) throw new HttpError(410, "code_expired");
      return result.email;
    },
  };
}

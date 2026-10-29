import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { SupportedLocale } from "@tuja/i18n/types";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { financeFetch } from "../http/finance-fetch.ts";

const BASE = "/api/auth";

/**
 * Throws `FinanceApiError` with the server's error code (e.g. `invite_invalid`,
 * `sign_up_invalid`, `rate_limited`), or `request_failed`.
 */
async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await financeFetch(
    `${BASE}${path}`,
    { method: "POST", body: JSON.stringify(body) },
    "request_failed",
  );
  return (await response.json()) as T;
}

async function runCeremony<T>(ceremony: () => Promise<T>): Promise<T> {
  try {
    return await ceremony();
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      throw new FinanceApiError("cancelled", 0);
    }
    throw error;
  }
}

async function register(optionsJSON: PublicKeyCredentialCreationOptionsJSON) {
  return runCeremony(() => startRegistration({ optionsJSON }));
}

export interface RecoveryEmail {
  email: string | null;
  verified: boolean;
}

interface SignedIn {
  householdId: string;
  memberId: string;
}

interface SignUpDetails {
  /** The new Member's name, which also names the Household. */
  memberName: string;
  baseCurrency: string;
  /** Names the household's first Groups. */
  locale: SupportedLocale;
}

/** Browser calls for every passkey flow. Each throws `FinanceApiError`; its code is `cancelled` when the visitor closed the passkey sheet. */
export const financePasskeyClient = {
  async signIn(): Promise<void> {
    const { options } = await post<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("/sign-in/options");
    const response = await runCeremony(() =>
      startAuthentication({ optionsJSON: options }),
    );
    await post("/sign-in/verify", { response });
  },

  /** Emails a sign-up code and link to `email`, in `locale`. The answer is the same for every address. */
  async requestSignUp(email: string, locale: SupportedLocale): Promise<void> {
    await post("/sign-up", { email, locale });
  },

  /** Checks the code from the sign-up email that this browser asked for, and returns the sign-up page's path, without a locale. When a user has the address already, it is the path of that user's Recovery link. */
  async checkSignUpCode(code: string): Promise<string> {
    const { path } = await post<{ path: string }>("/sign-up/code", { code });
    return path;
  },

  /** Creates a household with the visitor as its owner, and a passkey on this device. */
  async signUp(token: string, details: SignUpDetails): Promise<SignedIn> {
    const { options } = await post<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>("/sign-up/options", { token });
    const response = await register(options);
    return post<SignedIn>("/sign-up/verify", {
      token,
      response,
      ...details,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },

  /** `email` is the new user's Recovery email; a recovery invite takes none. */
  async acceptInvite(
    token: string,
    { email, locale }: { email?: string; locale: SupportedLocale },
  ): Promise<SignedIn> {
    const { options } = await post<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>("/invite/options", { token, email });
    const response = await register(options);
    return post<SignedIn>("/invite/verify", { token, response, email, locale });
  },

  /** Adds a passkey for the signed-in user, e.g. on a new device. */
  async addPasskey(): Promise<void> {
    const { options } = await post<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>("/passkeys/options");
    const response = await register(options);
    await post("/passkeys/verify", { response });
  },

  /**
   * Returns the invite path, `/invite/<token>`, without a locale.
   * For a Member who has signed in before, only the owner may invite, and the
   * link (`recovery: true`) replaces that Member's passkeys.
   */
  async createInvite(
    memberId: string,
  ): Promise<{ path: string; expiresAt: string; recovery: boolean }> {
    return post("/invites", { memberId });
  },

  async getRecoveryEmail(): Promise<RecoveryEmail> {
    const response = await financeFetch(`${BASE}/email`, {}, "request_failed");
    return (await response.json()) as RecoveryEmail;
  },

  /** Sets the signed-in user's Recovery email and sends it a verification link, in `locale`. */
  async setRecoveryEmail(
    email: string,
    locale: SupportedLocale,
  ): Promise<RecoveryEmail> {
    return post("/email", { email, locale });
  },

  /** Opens the verification link with `token`. False when the link is unknown, used or expired, or the email changed after it was sent. Throws `email_registered` when another user has the address. `locale` is for the notice to the Recovery email that this one replaces. */
  async verifyEmail(token: string, locale: SupportedLocale): Promise<boolean> {
    const { verified } = await post<{ verified: boolean }>("/email/verify", {
      token,
      locale,
    });
    return verified;
  },

  /** Asks for a recovery email. The answer is the same whether or not a user has this address. */
  async requestRecovery(email: string, locale: SupportedLocale): Promise<void> {
    await post("/recovery", { email, locale });
  },

  /** Checks the code from the recovery email that this browser asked for, and returns the path of the Recovery link, without a locale. */
  async checkRecoveryCode(code: string): Promise<string> {
    const { path } = await post<{ path: string }>("/recovery/code", { code });
    return path;
  },

  async signOut(): Promise<void> {
    await post("/sign-out");
  },

  async startDemo(): Promise<void> {
    await post("/demo");
  },
};

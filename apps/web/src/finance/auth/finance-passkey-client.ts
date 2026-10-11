import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { financeFetch } from "../http/finance-fetch.ts";

const BASE = "/api/finance/auth";

/**
 * Throws `FinanceApiError` with the server's error code (e.g. `invite_invalid`,
 * `setup_forbidden`, `rate_limited`), or `request_failed`.
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

/** A household that a recovery code can get back into, with its Recovery link path (no locale). */
export interface RecoveryChoice {
  householdName: string;
  path: string;
}

interface SignedIn {
  householdId: string;
  memberId: string;
}

type SetupMode =
  | { mode: "create" }
  | { mode: "claim"; householdName: string; memberName: string };

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

  /** Creates the first household or claims its unclaimed owner member. `onMode` runs before the passkey sheet opens. */
  async setUp(input: {
    setupSecret: string;
    householdName?: string;
    memberName?: string;
    onMode?: (mode: SetupMode) => void;
  }): Promise<SignedIn> {
    const { options, ...mode } = await post<
      { options: PublicKeyCredentialCreationOptionsJSON } & SetupMode
    >("/setup/options", {
      setupSecret: input.setupSecret,
      memberName: input.memberName,
    });
    input.onMode?.(mode);
    const response = await register(options);
    return post<SignedIn>("/setup/verify", {
      setupSecret: input.setupSecret,
      householdName: input.householdName,
      memberName: input.memberName,
      response,
    });
  },

  async acceptInvite(token: string): Promise<SignedIn> {
    const { options } = await post<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>("/invite/options", { token });
    const response = await register(options);
    return post<SignedIn>("/invite/verify", { token, response });
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
   * Returns the invite path, `/finance/invite/<token>`, without a locale.
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

  /** Opens the verification link with `token`. False when the link is unknown, used or expired, or the email changed after it was sent. */
  async verifyEmail(token: string): Promise<boolean> {
    const { verified } = await post<{ verified: boolean }>("/email/verify", {
      token,
    });
    return verified;
  },

  /** Asks for a recovery email. The answer is the same whether or not a user has this address. */
  async requestRecovery(email: string, locale: SupportedLocale): Promise<void> {
    await post("/recovery", { email, locale });
  },

  /** Checks the code from the recovery email that this browser asked for, and returns a Recovery link for each household of the address. */
  async checkRecoveryCode(code: string): Promise<RecoveryChoice[]> {
    const { households } = await post<{ households: RecoveryChoice[] }>(
      "/recovery/code",
      { code },
    );
    return households;
  },

  async signOut(): Promise<void> {
    await post("/sign-out");
  },
};

import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
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

interface SignedIn {
  householdId: string;
  memberId: string;
}

type SetupMode =
  | { mode: "create" }
  | { mode: "claim" | "recover"; householdName: string; memberName: string };

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

  /**
   * Creates the first household, claims its unclaimed owner member, or, once
   * the owner is claimed, replaces the owner's passkeys and ends the owner's
   * sessions (`recover`). `onMode` runs before the passkey sheet opens.
   */
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

  async signOut(): Promise<void> {
    await post("/sign-out");
  },
};

import { fetchJson } from "@tuja/auth-ui/fetch-json";
import { passkeyClient, postAuth } from "@tuja/auth-ui/passkey-client";
import type { SupportedLocale } from "@tuja/i18n/types";

export interface RecoveryEmail {
  email: string | null;
  verified: boolean;
}

interface SignedIn {
  householdId: string;
  memberId: string;
}

interface SetUpDetails {
  /** The new Member's name, which also names the Household. */
  memberName: string;
  baseCurrency: string;
  /** Names the household's first Groups. */
  locale: SupportedLocale;
}

/** The shared passkey calls, and the calls to Finance's own auth routes. Each throws `ApiError`. */
export const financePasskeyClient = {
  ...passkeyClient,

  /** Creates the first household of the signed-in user, with the user as its owner. */
  async setUp(details: SetUpDetails): Promise<SignedIn> {
    return postAuth<SignedIn>("/set-up", {
      ...details,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },

  /** Makes the signed-in user the Member that the invite is for. */
  async acceptInvite(token: string): Promise<SignedIn> {
    return postAuth<SignedIn>("/invite/accept", { token });
  },

  /**
   * Returns the path of the link's page, without a locale. For a Member who
   * has signed in before, only the owner may make the link, and it is a
   * recovery link (`recovery: true`), which replaces that Member's passkeys.
   */
  async createInvite(
    memberId: string,
  ): Promise<{ path: string; expiresAt: string; recovery: boolean }> {
    return postAuth("/invites", { memberId });
  },

  async getRecoveryEmail(): Promise<RecoveryEmail> {
    const response = await fetchJson("/api/auth/email", {}, "request_failed");
    return (await response.json()) as RecoveryEmail;
  },

  /** Sets the signed-in user's Recovery email and sends it a verification link, in `locale`. */
  async setRecoveryEmail(
    email: string,
    locale: SupportedLocale,
  ): Promise<RecoveryEmail> {
    return postAuth("/email", { email, locale });
  },

  /** Opens the verification link with `token`. False when the link is unknown, used or expired, or the email changed after it was sent. Throws `email_registered` when another user has the address. `locale` is for the notice to the Recovery email that this one replaces. */
  async verifyEmail(token: string, locale: SupportedLocale): Promise<boolean> {
    const { verified } = await postAuth<{ verified: boolean }>(
      "/email/verify",
      { token, locale },
    );
    return verified;
  },

  async startDemo(): Promise<void> {
    await postAuth("/demo");
  },
};

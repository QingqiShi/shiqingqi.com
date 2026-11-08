import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { SupportedLocale } from "@tuja/i18n/types";
import { BuddyApiError } from "../http/buddy-api-error.ts";
import { postJson } from "../http/post-json.ts";

async function runCeremony<T>(ceremony: () => Promise<T>): Promise<T> {
  try {
    return await ceremony();
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      throw new BuddyApiError("cancelled", 0);
    }
    throw error;
  }
}

async function register(options: PublicKeyCredentialCreationOptionsJSON) {
  return runCeremony(() => startRegistration({ optionsJSON: options }));
}

/** The account that a ceremony signed in. */
interface SignedIn {
  name: string;
}

/** Browser calls for the passkey flows. Each throws `BuddyApiError`; its code is `cancelled` when the visitor closed the passkey sheet. */
export const passkeyClient = {
  async signIn(): Promise<SignedIn> {
    const { options } = await postJson<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("/api/auth/sign-in/options");
    const response = await runCeremony(() =>
      startAuthentication({ optionsJSON: options }),
    );
    return postJson<SignedIn>("/api/auth/sign-in/verify", { response });
  },

  async requestSignUp(email: string, locale: SupportedLocale): Promise<void> {
    await postJson("/api/auth/sign-up", { email, locale });
  },

  /** Checks the code from the sign-up email that this browser asked for, and returns the sign-up page's path, without a locale. When an account has the address already, it is the path of that account's recovery link. */
  async checkSignUpCode(code: string): Promise<string> {
    const { path } = await postJson<{ path: string }>(
      "/api/auth/sign-up/code",
      {
        code,
      },
    );
    return path;
  },

  /** Makes the account and a passkey on this device, and signs in. */
  async signUp(token: string): Promise<SignedIn> {
    const { options } = await postJson<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>("/api/auth/sign-up/options", { token });
    const response = await register(options);
    return postJson<SignedIn>("/api/auth/sign-up/verify", {
      token,
      response,
    });
  },

  async requestRecovery(email: string, locale: SupportedLocale): Promise<void> {
    await postJson("/api/auth/recovery", { email, locale });
  },

  /** Checks the code from the recovery email that this browser asked for, and returns the path of the recovery link, without a locale. */
  async checkRecoveryCode(code: string): Promise<string> {
    const { path } = await postJson<{ path: string }>(
      "/api/auth/recovery/code",
      { code },
    );
    return path;
  },

  /** Saves a new passkey on this device in place of the account's lost ones, and signs in. */
  async recover(token: string): Promise<SignedIn> {
    const { options } = await postJson<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>("/api/auth/recovery/options", { token });
    const response = await register(options);
    return postJson<SignedIn>("/api/auth/recovery/verify", {
      token,
      response,
    });
  },

  async signOut(): Promise<void> {
    await postJson("/api/auth/sign-out");
  },
};

import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { SupportedLocale } from "@tuja/i18n/types";
import { ApiError } from "./api-error.ts";
import { postJson } from "./fetch-json.ts";

const BASE = "/api/auth";

/** Sends a JSON POST to an auth route of the app, e.g. `/sign-out`. It throws `ApiError` with the server's error code, or `request_failed`. */
export async function postAuth<T = unknown>(
  path: string,
  body: unknown = {},
): Promise<T> {
  return postJson<T>(`${BASE}${path}`, body);
}

async function runCeremony<T>(ceremony: () => Promise<T>): Promise<T> {
  try {
    return await ceremony();
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      throw new ApiError("cancelled", 0);
    }
    if (error instanceof Error && error.name === "InvalidStateError") {
      throw new ApiError("passkey_exists", 0);
    }
    throw error;
  }
}

/** Asks the server at `path` for options, makes a passkey on this device, and sends it back with `body`. */
async function register(path: string, body: object = {}): Promise<void> {
  const { options } = await postAuth<{
    options: PublicKeyCredentialCreationOptionsJSON;
  }>(`${path}/options`, body);
  const response = await runCeremony(() =>
    startRegistration({ optionsJSON: options }),
  );
  await postAuth(`${path}/verify`, { ...body, response });
}

/** Browser calls for the passkey flows of `@tuja/server-auth`. Each throws `ApiError`; its code is `cancelled` when the visitor closed the passkey sheet, and `passkey_exists` when the device has a passkey of this user already. */
export const passkeyClient = {
  async signIn(): Promise<void> {
    const { options } = await postAuth<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("/sign-in/options");
    const response = await runCeremony(() =>
      startAuthentication({ optionsJSON: options }),
    );
    await postAuth("/sign-in/verify", { response });
  },

  /** Emails a sign-up code and link to `email`, in `locale`. The answer is the same for every address. */
  async requestSignUp(
    email: string,
    locale: SupportedLocale,
    next: string,
  ): Promise<void> {
    await postAuth("/sign-up", { email, locale, next });
  },

  /** Checks the code from the sign-up email that this browser asked for, and returns the sign-up page's path, without a locale. When a user has the address already, it is the path of that user's recovery link. */
  async checkSignUpCode(code: string): Promise<string> {
    const { path } = await postAuth<{ path: string }>("/sign-up/code", {
      code,
    });
    return path;
  },

  /** Creates a user for the visitor and a passkey on this device, and signs in. */
  async signUp(token: string): Promise<void> {
    await register("/sign-up", { token });
  },

  /** Adds a passkey for the signed-in user, e.g. on a new device. */
  async addPasskey(): Promise<void> {
    await register("/passkeys");
  },

  /** Emails a code to `email`, the new address of the signed-in user, in `locale`. */
  async requestEmailChange(
    email: string,
    locale: SupportedLocale,
  ): Promise<void> {
    await postAuth("/email", { email, locale });
  },

  /** Checks the code from the email that this browser asked for, gives the signed-in user that address, and returns it. */
  async confirmEmailChange(code: string): Promise<string> {
    const { email } = await postAuth<{ email: string }>("/email/verify", {
      code,
    });
    return email;
  },

  /** Asks for a recovery email. The answer is the same whether or not a user has this address. */
  async requestRecovery(
    email: string,
    locale: SupportedLocale,
    next: string,
  ): Promise<void> {
    await postAuth("/recovery", { email, locale, next });
  },

  /** Checks the code from the recovery email that this browser asked for, and returns the path of the recovery link, without a locale. */
  async checkRecoveryCode(code: string): Promise<string> {
    const { path } = await postAuth<{ path: string }>("/recovery/code", {
      code,
    });
    return path;
  },

  /** Saves a new passkey on this device in place of the lost passkeys of the user that the recovery link is for, and signs in. */
  async recover(token: string): Promise<void> {
    await register("/recovery", { token });
  },

  /** Checks a passkey of the signed-in user on this device, then deletes the user's account and signs out. */
  async deleteAccount(): Promise<void> {
    const { options } = await postAuth<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("/delete-account/options");
    const response = await runCeremony(() =>
      startAuthentication({ optionsJSON: options }),
    );
    await postAuth("/delete-account/verify", { response });
  },

  async signOut(): Promise<void> {
    await postAuth("/sign-out");
  },
};

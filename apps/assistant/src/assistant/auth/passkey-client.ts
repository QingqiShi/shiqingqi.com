import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { AssistantApiError } from "../http/assistant-api-error.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";

const BASE = "/api/auth";

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await assistantFetch(
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
      throw new AssistantApiError("cancelled", 0);
    }
    throw error;
  }
}

/** Browser calls for the passkey flows. Each throws `AssistantApiError`; its code is `cancelled` when the visitor closed the passkey sheet. */
export const passkeyClient = {
  async signIn(): Promise<void> {
    const { options } = await post<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("/sign-in/options");
    const response = await runCeremony(() =>
      startAuthentication({ optionsJSON: options }),
    );
    await post("/sign-in/verify", { response });
  },

  async signOut(): Promise<void> {
    await post("/sign-out");
  },
};

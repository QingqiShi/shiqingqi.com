import "server-only";
import { readCredentialKey } from "./credential-cipher.ts";
import { createLunchFlowClient } from "./lunchflow/create-lunch-flow-client.ts";
import { makeBankProvider } from "./make-bank-provider.ts";

export const bankProvider = makeBankProvider({
  fake: () => process.env.FINANCE_LUNCHFLOW_MODE === "fake",
  credentialKey: () => readCredentialKey(process.env.FINANCE_CREDENTIAL_KEY),
  createClient: (apiKey) => createLunchFlowClient({ apiKey }),
});

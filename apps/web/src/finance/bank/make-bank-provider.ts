import { bankLinkRepository } from "../db/repositories/bank-link-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { buildFakeBankFixture } from "./build-fake-bank-fixture.ts";
import { credentialCipher } from "./credential-cipher.ts";
import { createFakeBankClient } from "./lunchflow/create-fake-bank-client.ts";
import type { BankClient } from "./lunchflow/types.ts";
import type { BankConnection } from "./types.ts";

export interface BankProviderSource {
  /** Dev and e2e: a bank made up from the Household's own data. */
  fake: () => boolean;
  /** The key that seals each Connection's credential, or null when it is not set. */
  credentialKey: () => Uint8Array | null;
  createClient: (apiKey: string) => BankClient;
}

export type BankProvider = ReturnType<typeof makeBankProvider>;

/**
 * Each Household reaches Lunch Flow with the API key its owner stored on its
 * Connection. A Household without one is not connected. In fake mode any
 * stored key gives the fake bank, and every key is taken without a check.
 */
export function makeBankProvider(source: BankProviderSource) {
  return {
    credentialKey: source.credentialKey,

    getBankClient: async (
      scope: RepositoryScope,
      now: Date,
    ): Promise<BankConnection> => {
      const credential = await bankLinkRepository.findCredential(scope);
      if (!credential) return { status: "not_connected" };
      const view = {
        lastFour: credential.lastFour,
        savedAt: credential.savedAt.toISOString(),
      };
      if (source.fake()) {
        const household = await householdRepository.find(scope);
        const today = todayInTimeZone(
          household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
          now,
        );
        return {
          status: "connected",
          mode: "fake",
          credential: view,
          client: createFakeBankClient(
            await buildFakeBankFixture(scope, today),
          ),
        };
      }
      const key = source.credentialKey();
      if (!key) {
        throw new Error("FINANCE_CREDENTIAL_KEY is not 32 bytes in base64");
      }
      return {
        status: "connected",
        mode: "real",
        credential: view,
        client: source.createClient(
          credentialCipher.open(credential.sealed, key, scope.householdId),
        ),
      };
    },

    /** Throws the provider's `BankError` when it refuses `apiKey`. */
    verifyApiKey: async (apiKey: string) => {
      if (source.fake()) return;
      await source.createClient(apiKey).listAccounts();
    },
  };
}

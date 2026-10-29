import { bankLinkRepository } from "../db/repositories/bank-link-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { buildFakeBankFixture } from "./build-fake-bank-fixture.ts";
import { credentialCipher } from "./credential-cipher.ts";
import { createFakeBankClient } from "./lunchflow/create-fake-bank-client.ts";
import type { BankClient } from "./lunchflow/types.ts";
import type { BankConnection } from "./types.ts";

interface BankProviderSource {
  /** Dev and e2e: a bank made up from the Household's own data. */
  fake: () => boolean;
  /** The key that seals each Connection's credential, or null when it is not set. */
  credentialKey: () => Uint8Array | null;
  createClient: (apiKey: string) => BankClient;
}

/**
 * Each Household reaches Lunch Flow with the API key its owner stored on its
 * Connection. A Household without one, or with one that no longer opens, is
 * not connected. In fake mode any stored key gives the fake bank, and every
 * key is taken without a check.
 */
export function makeBankProvider(source: BankProviderSource) {
  return {
    credentialKey: source.credentialKey,

    getBankClient: async (
      db: FinanceDb,
      householdId: string,
      now: Date,
    ): Promise<BankConnection> => {
      const found = await withHousehold(db, householdId, async (scope) => {
        const credential = await bankLinkRepository.findCredential(scope);
        if (!credential || !source.fake()) return { credential };
        const household = await householdRepository.find(scope);
        const today = todayInTimeZone(
          household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
          now,
        );
        return {
          credential,
          fixture: await buildFakeBankFixture(scope, today),
        };
      });
      const { credential } = found;
      if (!credential) return { status: "not_connected" };
      const view = {
        lastFour: credential.lastFour,
        savedAt: credential.savedAt.toISOString(),
      };
      if (found.fixture) {
        return {
          status: "connected",
          mode: "fake",
          credential: view,
          client: createFakeBankClient(found.fixture),
        };
      }
      const key = source.credentialKey();
      if (!key) {
        throw new Error("FINANCE_CREDENTIAL_KEY is not 32 bytes in base64");
      }
      const apiKey = credentialCipher.open(credential.sealed, key, householdId);
      if (apiKey === null) {
        return { status: "not_connected", keyUnreadable: true };
      }
      return {
        status: "connected",
        mode: "real",
        credential: view,
        client: source.createClient(apiKey),
      };
    },

    /** Throws the provider's `BankError` when it refuses `apiKey`. */
    verifyApiKey: async (apiKey: string) => {
      if (source.fake()) return;
      await source.createClient(apiKey).listAccounts();
    },
  };
}

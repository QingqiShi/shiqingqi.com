import { BankError } from "./bank-error.ts";
import type {
  BankClient,
  BankErrorKind,
  ProviderAccount,
  ProviderBalance,
  ProviderTransaction,
} from "./types.ts";

/** The scripted state of a fake bank. Errors are per provider account. */
export interface FakeBankFixture {
  accounts: ProviderAccount[];
  transactions: Partial<Record<string, ProviderTransaction[]>>;
  balances: Partial<Record<string, ProviderBalance>>;
  errors?: Partial<Record<string, BankErrorKind>>;
  listAccountsError?: BankErrorKind;
}

/** A `BankClient` that answers from a fixture, for dev, e2e and tests. A test may change the fixture between calls. */
export function createFakeBankClient(fixture: FakeBankFixture): BankClient {
  function failIfScripted(providerAccountId: string) {
    const kind = fixture.errors?.[providerAccountId];
    if (kind) throw new BankError(kind, `Fake ${kind}`);
    if (!fixture.accounts.some((account) => account.id === providerAccountId)) {
      throw new BankError("not_found", "Account not found");
    }
  }

  return {
    // eslint-disable-next-line @typescript-eslint/require-await -- The fake must reject, not throw, as the real client does.
    async listAccounts() {
      if (fixture.listAccountsError) {
        throw new BankError(fixture.listAccountsError, "Fake error");
      }
      return fixture.accounts.map((account) => ({ ...account }));
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- The fake must reject, not throw, as the real client does.
    async listTransactions(providerAccountId, range) {
      failIfScripted(providerAccountId);
      const rows = fixture.transactions[providerAccountId] ?? [];
      return rows
        .filter(
          (row) =>
            row.date >= range.from &&
            (range.to === undefined || row.date <= range.to),
        )
        .map((row) => ({ ...row }));
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- The fake must reject, not throw, as the real client does.
    async getBalance(providerAccountId) {
      failIfScripted(providerAccountId);
      const balance = fixture.balances[providerAccountId];
      if (!balance) throw new BankError("unavailable", "No balance");
      return { ...balance };
    },
  };
}

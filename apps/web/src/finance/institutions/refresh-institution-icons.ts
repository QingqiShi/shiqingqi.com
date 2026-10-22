import { createHash } from "node:crypto";
import type { InstitutionHints } from "../ai/guess-institution-domain.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import {
  asFinanceApp,
  withHousehold,
  type FinanceAppDb,
} from "../db/with-household.ts";
import {
  institutionDomainOf,
  type InstitutionDomainFields,
} from "../domain/accounts/institution-fields-after.ts";
import { institutionNameKey } from "../domain/accounts/institution-name-key.ts";
import { forEachLimited } from "../domain/for-each-limited.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import {
  domainGuessKeyId,
  institutionCacheRepository,
  institutionIconVersionOf,
  type DomainGuessKey,
} from "./institution-cache-repository.ts";

const CONCURRENCY = 4;
/** A model call with two web searches takes up to about 30 s. */
const CALL_TIMEOUT_MS = 45_000;

export interface RefreshInstitutionIconsDependencies {
  /** Guesses the domain of an institution name, null for none; throws when it cannot answer now. Absent when no model is set up. */
  guessDomain?: (
    name: string,
    hints: InstitutionHints,
    signal: AbortSignal,
  ) => Promise<string | null>;
  /** The icon of a domain as WebP bytes, or null when the site has none we can use. */
  fetchIcon: (
    domain: string,
    signal: AbortSignal,
  ) => Promise<Uint8Array | null>;
  now: () => Date;
  /** Epoch milliseconds, by `now`, when the run must be done: a model call or fetch starts only when it can time out before then. */
  endsAt?: number;
  /** How long one model call or fetch may take before it counts as failed. */
  callTimeoutMs?: number;
}

export interface RefreshInstitutionIconsResult {
  guessed: number;
  fetched: number;
  failed: number;
  updated: number;
}

interface AccountInstitution {
  id: string;
  institution: string;
  institutionDomain: string | null;
  guessedInstitutionDomain: string | null;
  institutionIconVersion: string | null;
  currency: string;
}

interface Work<T> {
  failure: string;
  claim: (app: FinanceAppDb) => Promise<number | null>;
  call: (signal: AbortSignal) => Promise<T>;
  /** Records the answer; false when it is no answer, so that the work is tried again later. */
  save: (app: FinanceAppDb, value: T) => Promise<boolean>;
  fail: (app: FinanceAppDb, attempts: number) => Promise<void>;
}

function iconVersion(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

function guessKeyOf(
  account: AccountInstitution,
  baseCurrency: string,
): DomainGuessKey | null {
  const nameKey = institutionNameKey(account.institution);
  return nameKey === ""
    ? null
    : { nameKey, baseCurrency, accountCurrency: account.currency };
}

/** The guess an account must hold: none without a name, else the cached answer, else the guess it holds now. */
function guessFor(
  account: AccountInstitution,
  key: DomainGuessKey | null,
  answers: ReadonlyMap<string, string | null>,
) {
  if (key === null) return null;
  const answer = answers.get(domainGuessKeyId(key));
  return answer === undefined ? account.guessedInstitutionDomain : answer;
}

/** The domain fields of the account with the guess that `guessFor` gives. */
function domainFieldsAfterGuess(
  account: AccountInstitution,
  baseCurrency: string,
  answers: ReadonlyMap<string, string | null>,
): InstitutionDomainFields {
  return {
    institutionDomain: account.institutionDomain,
    guessedInstitutionDomain: guessFor(
      account,
      guessKeyOf(account, baseCurrency),
      answers,
    ),
  };
}

/**
 * The accounts whose server fields are not what they must be, with the
 * fields they must hold: the guess that `guessFor` gives, and the version in
 * `versions` of the domain that the account then shows. An account that
 * shows a domain that is not in `versions` keeps its version, because the
 * write that gave it that domain also set the version.
 */
function staleInstitutionFields(
  accounts: readonly AccountInstitution[],
  baseCurrency: string,
  answers: ReadonlyMap<string, string | null>,
  versions: ReadonlyMap<string, string | null>,
) {
  const stale = new Map<
    string,
    Pick<AccountRow, "guessedInstitutionDomain" | "institutionIconVersion">
  >();
  for (const account of accounts) {
    const after = domainFieldsAfterGuess(account, baseCurrency, answers);
    const domain = institutionDomainOf(after);
    const keepsVersion =
      domain !== null &&
      !versions.has(domain) &&
      domain === institutionDomainOf(account);
    const version = keepsVersion
      ? account.institutionIconVersion
      : institutionIconVersionOf(after, versions);
    if (
      after.guessedInstitutionDomain !== account.guessedInstitutionDomain ||
      version !== account.institutionIconVersion
    ) {
      stale.set(account.id, {
        guessedInstitutionDomain: after.guessedInstitutionDomain,
        institutionIconVersion: version,
      });
    }
  }
  return stale;
}

/** The items, the most counted first, else in their first order. */
function byCountDescending<T>(
  items: Iterable<T>,
  countOf: (item: T) => number,
) {
  return [...items]
    .map((item, index) => ({ item, index, count: countOf(item) }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ item }) => item);
}

/** Gives the signal to `call` and rejects when the time is up, also when `call` does not stop. */
function callWithin<T>(
  timeoutMs: number,
  call: (signal: AbortSignal) => Promise<T>,
) {
  const signal = AbortSignal.timeout(timeoutMs);
  const timedOut = new Promise<never>((_, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(new Error(`No answer within ${String(timeoutMs)} ms`));
      },
      { once: true },
    );
  });
  return Promise.race([call(signal), timedOut]);
}

/** Claims the work, calls out of every transaction, then records the answer or the failure. */
async function attempt<T>(db: FinanceDb, timeoutMs: number, work: Work<T>) {
  const attempts = await asFinanceApp(db, work.claim);
  if (attempts === null) return "skipped";
  const saved = await callWithin(timeoutMs, work.call).then(
    (value) => asFinanceApp(db, (app) => work.save(app, value)),
    (error: unknown) => {
      console.error(work.failure, error);
      return false;
    },
  );
  if (!saved) await asFinanceApp(db, (app) => work.fail(app, attempts));
  return saved ? "saved" : "failed";
}

/**
 * Works out the institution icon and its version for every account of one
 * Household: guesses the domain of each institution name whose guess key
 * has no answer (from the global cache, else from the model), fetches the
 * icon of each domain that is due, then writes the changed guesses and icon
 * versions to the accounts in one server write, so that clients see them on
 * their next pull. A failed guess or fetch is recorded in the cache and
 * tried again by a later run. The names and domains of the most accounts go
 * first, so that they get the time when the run ends before all work is
 * done. Work that another run holds is skipped, and this run goes on to the
 * next.
 */
export async function refreshInstitutionIcons(
  db: FinanceDb,
  householdId: string,
  dependencies: RefreshInstitutionIconsDependencies,
): Promise<RefreshInstitutionIconsResult> {
  const result = { guessed: 0, fetched: 0, failed: 0, updated: 0 };
  const timeoutMs = dependencies.callTimeoutMs ?? CALL_TIMEOUT_MS;
  const endsAt = dependencies.endsAt ?? Infinity;
  const hasTimeForCall = () =>
    dependencies.now().getTime() + timeoutMs <= endsAt;
  const count = (
    outcome: "saved" | "failed" | "skipped",
    saved: "guessed" | "fetched",
  ) => {
    if (outcome === "saved") result[saved]++;
    else if (outcome === "failed") result.failed++;
  };

  const { baseCurrency, accounts } = await withHousehold(
    db,
    householdId,
    async (scope) => ({
      baseCurrency:
        (await householdRepository.find(scope))?.baseCurrency ?? "GBP",
      accounts: await accountRepository.listInstitutionFields(scope),
    }),
  );
  const toGuess = new Map<
    string,
    { key: DomainGuessKey; name: string; accounts: number }
  >();
  const keys = new Map<string, DomainGuessKey>();
  for (const account of accounts) {
    const key = guessKeyOf(account, baseCurrency);
    if (!key) continue;
    const id = domainGuessKeyId(key);
    keys.set(id, key);
    if (account.institutionDomain !== null) continue;
    const guess = toGuess.get(id) ?? {
      key,
      name: account.institution.trim(),
      accounts: 0,
    };
    guess.accounts++;
    toGuess.set(id, guess);
  }

  const { answers, waiting } = await asFinanceApp(db, (app) =>
    institutionCacheRepository.findGuesses(
      app,
      [...keys.values()],
      dependencies.now(),
    ),
  );
  const guessDomain = dependencies.guessDomain;
  if (guessDomain) {
    const due = byCountDescending(
      [...toGuess].filter(([id]) => !answers.has(id) && !waiting.has(id)),
      ([, guess]) => guess.accounts,
    );
    await forEachLimited(due, CONCURRENCY, async ([id, { key, name }]) => {
      if (!hasTimeForCall()) return;
      const now = dependencies.now();
      const hints = {
        baseCurrency: key.baseCurrency,
        accountCurrency: key.accountCurrency,
      };
      const outcome = await attempt(db, timeoutMs, {
        failure: "Institution domain guess failed",
        claim: (app) => institutionCacheRepository.claimGuess(app, key, now),
        call: (signal) => guessDomain(name, hints, signal),
        save: async (app, domain) => {
          await institutionCacheRepository.saveGuess(app, key, domain, now);
          answers.set(id, domain);
          return true;
        },
        fail: (app, attempts) =>
          institutionCacheRepository.failGuess(app, key, attempts, now),
      });
      count(outcome, "guessed");
    });
  }

  const accountsOfDomain = new Map<string, number>();
  for (const account of accounts) {
    const domain = institutionDomainOf(
      domainFieldsAfterGuess(account, baseCurrency, answers),
    );
    if (domain !== null) {
      accountsOfDomain.set(domain, (accountsOfDomain.get(domain) ?? 0) + 1);
    }
  }
  const { due: dueIcons, versions } = await asFinanceApp(db, (app) =>
    institutionCacheRepository.findIconsToRefresh(
      app,
      [...accountsOfDomain.keys()],
      dependencies.now(),
    ),
  );
  await forEachLimited(
    byCountDescending(dueIcons, (domain) => accountsOfDomain.get(domain) ?? 0),
    CONCURRENCY,
    async (domain) => {
      if (!hasTimeForCall()) return;
      const now = dependencies.now();
      const outcome = await attempt(db, timeoutMs, {
        failure: `Institution icon fetch failed for ${domain}`,
        claim: (app) => institutionCacheRepository.claimIcon(app, domain, now),
        call: (signal) => dependencies.fetchIcon(domain, signal),
        save: async (app, image) => {
          if (image === null) return false;
          const version = iconVersion(image);
          await institutionCacheRepository.saveIcon(
            app,
            domain,
            { image, version },
            now,
          );
          versions.set(domain, version);
          return true;
        },
        fail: (app, attempts) =>
          institutionCacheRepository.failIcon(app, domain, attempts, now),
      });
      count(outcome, "fetched");
    },
  );

  if (
    staleInstitutionFields(accounts, baseCurrency, answers, versions).size === 0
  ) {
    return result;
  }

  const { result: updated } = await runServerWrite(
    db,
    householdId,
    dependencies.now(),
    async (context) => {
      const changed = staleInstitutionFields(
        await accountRepository.listInstitutionFields(context.scope),
        context.household.baseCurrency,
        answers,
        versions,
      );
      if (changed.size > 0) {
        await accountRepository.setServerInstitutionFields(
          context.scope,
          changed,
        );
        context.markWritten();
      }
      return changed.size;
    },
  );
  result.updated = updated;
  return result;
}

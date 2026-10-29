import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { LabellingModel } from "../ai/label-bank-rows.ts";
import type { FinanceSession } from "../auth/types.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import { bankLinkRepository } from "../db/repositories/bank-link-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { isLinkableAccount } from "../domain/accounts/is-linkable-account.ts";
import { financeJson, financeNoContent } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardDependencies,
  type FinanceRequestGuardOptions,
} from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { reconciliation } from "../reconciliation/reconciliation.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { BalanceCheckNotFoundError, balanceCheck } from "./balance-check.ts";
import { credentialCipher } from "./credential-cipher.ts";
import { BankError } from "./lunchflow/bank-error.ts";
import { processBankRows } from "./process-bank-rows.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import type {
  BankApiErrorCode,
  BankConnection,
  BankLinkView,
  CredentialView,
  ProviderAccountsResponse,
  SyncNowResponse,
  UnbackedEntriesResponse,
} from "./types.ts";

export interface BankHandlerDependencies extends FinanceRequestGuardDependencies {
  getDb: () => FinanceDb;
  getBankClient: (
    db: FinanceDb,
    householdId: string,
    now: Date,
  ) => Promise<BankConnection>;
  /** Throws the provider's `BankError` when it refuses `apiKey`. */
  verifyApiKey: (apiKey: string) => Promise<void>;
  /** The key that seals each Connection's credential, or null when it is not set. */
  credentialKey: () => Uint8Array | null;
  getModel: () => LabellingModel | null;
  /** Runs `task` after the response is sent, as Next's `after` does. */
  afterResponse: (task: () => Promise<void>) => void;
  now: () => Date;
}

/** A request the handler refuses; the write it was in rolls back. */
class BankRequestError extends Error {
  readonly code: BankApiErrorCode;
  readonly status: number;

  constructor(code: BankApiErrorCode, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const putLinkSchema = z.object({
  accountId: z.uuid(),
  providerAccountId: z.string().trim().min(1).max(200),
  signMultiplier: z.union([z.literal(1), z.literal(-1)]).default(1),
});
const putCredentialSchema = z.object({
  apiKey: z.string().trim().min(8).max(500),
});
const linkIdSchema = z.object({ linkId: z.uuid() });
const keptTransactionSchema = z.object({
  linkId: z.uuid(),
  transactionId: z.uuid(),
});

function failure(code: BankApiErrorCode, status: number) {
  return financeJson({ error: code }, { status });
}

function toView(link: {
  id: string;
  accountId: string;
  signMultiplier: number;
  status: string;
  lastSyncedOn: string | null;
  lastSyncAt: Date | null;
  lastError: string | null;
}): BankLinkView {
  return {
    id: link.id,
    accountId: link.accountId,
    signMultiplier: link.signMultiplier === -1 ? -1 : 1,
    status: link.status,
    lastSyncedOn: link.lastSyncedOn,
    lastSyncAt: link.lastSyncAt?.toISOString() ?? null,
    lastError: link.lastError,
  };
}

/**
 * The Connections settings and Review routes under `/api/bank/`.
 * Every route needs a session; every write also needs a same-origin
 * request. The Household always comes from the session.
 */
export function makeBankHandlers(dependencies: BankHandlerDependencies) {
  /** The Household of the session, not yet in a transaction: each read and write opens its own. */
  interface SessionHousehold {
    db: FinanceDb;
    householdId: string;
  }

  type Guarded = (
    request: Request,
    session: FinanceSession,
    scope: SessionHousehold,
  ) => Promise<Response>;

  function guarded(handler: Guarded, options: FinanceRequestGuardOptions) {
    return async (request: Request) => {
      const session = await guardFinanceRequest(dependencies, request, options);
      if (session instanceof Response) return session;
      const scope = {
        db: dependencies.getDb(),
        householdId: session.householdId,
      };
      try {
        return await handler(request, session, scope);
      } catch (error) {
        if (error instanceof BankRequestError) {
          return failure(error.code, error.status);
        }
        if (error instanceof BalanceCheckNotFoundError) {
          return failure("not-found", 404);
        }
        if (error instanceof BankError) return failure(error.kind, 502);
        throw error;
      }
    };
  }

  function lunchFlowConnectionId(scope: SessionHousehold) {
    return nameBasedUuid(`connection:${scope.householdId}:lunchflow`);
  }

  async function connectedClient(scope: SessionHousehold, now: Date) {
    const connection = await dependencies.getBankClient(
      scope.db,
      scope.householdId,
      now,
    );
    if (connection.status !== "connected") {
      throw new BankRequestError("not-connected", 409);
    }
    return connection;
  }

  return {
    /** `GET /api/bank/accounts`: provider accounts with their link state. */
    listAccounts: guarded(
      async (_request, _session, scope) => {
        const connection = await dependencies.getBankClient(
          scope.db,
          scope.householdId,
          dependencies.now(),
        );
        if (connection.status !== "connected") {
          return financeJson(connection satisfies ProviderAccountsResponse);
        }
        const [accounts, { connectionId, liveLinks }] = await Promise.all([
          connection.client.listAccounts(),
          withHousehold(scope.db, scope.householdId, async (read) => ({
            connectionId: await bankLinkRepository.findConnectionId(read),
            liveLinks: await bankLinkRepository.listLive(read),
          })),
        ]);
        const links = liveLinks.filter(
          (link) => link.connectionId === connectionId,
        );
        const linkOf = new Map(
          links.map((link) => [link.providerAccountId, link]),
        );
        return financeJson({
          status: "connected",
          mode: connection.mode,
          credential: connection.credential,
          accounts: accounts.map((account) => {
            const link = linkOf.get(account.id);
            return {
              providerAccountId: account.id,
              bankLoginId: account.bankLoginId,
              name: account.name,
              institution: account.institution,
              institutionLogo: account.institutionLogo,
              currency: account.currency,
              needsReconnect:
                account.status !== null && account.status !== "ACTIVE",
              link: link ? toView(link) : null,
            };
          }),
        } satisfies ProviderAccountsResponse);
      },
      { write: false },
    ),

    /**
     * `PUT /api/bank/credential`: stores the Lunch Flow API key on the
     * Household's Connection, sealed, after Lunch Flow takes it. 422 `auth`
     * when Lunch Flow refuses it. The key never comes back.
     */
    putCredential: guarded(
      async (request, _session, scope) => {
        const input = await readFinanceBody(request, putCredentialSchema);
        if (input instanceof Response) return input;
        const key = dependencies.credentialKey();
        if (!key) throw new BankRequestError("not-configured", 503);
        try {
          await dependencies.verifyApiKey(input.apiKey);
        } catch (error) {
          if (error instanceof BankError && error.kind === "auth") {
            throw new BankRequestError("auth", 422);
          }
          throw error;
        }
        const now = dependencies.now();
        const credential = {
          sealed: credentialCipher.seal(input.apiKey, key, scope.householdId),
          lastFour: input.apiKey.slice(-4),
          savedAt: now,
        };
        await runServerWrite(scope.db, scope.householdId, now, (context) =>
          bankLinkRepository.saveCredential(
            context.scope,
            lunchFlowConnectionId(scope),
            credential,
          ),
        );
        return financeJson({
          lastFour: credential.lastFour,
          savedAt: now.toISOString(),
        } satisfies CredentialView);
      },
      { write: true, owner: true },
    ),

    /** `DELETE /api/bank/credential`: forgets the API key; the Bank links stay and sync stops. */
    removeCredential: guarded(
      async (_request, _session, scope) => {
        await runServerWrite(
          scope.db,
          scope.householdId,
          dependencies.now(),
          (context) => bankLinkRepository.clearCredential(context.scope),
        );
        return financeNoContent();
      },
      { write: true, owner: true },
    ),

    /** `PUT /api/bank/links`: binds a cash or credit account to a provider account. */
    putLink: guarded(
      async (request, _session, scope) => {
        const input = await readFinanceBody(request, putLinkSchema);
        if (input instanceof Response) return input;
        const now = dependencies.now();
        const connection = await connectedClient(scope, now);
        const provider = (await connection.client.listAccounts()).find(
          (account) => account.id === input.providerAccountId,
        );
        if (!provider)
          throw new BankRequestError("unknown-provider-account", 400);

        const { result } = await runServerWrite(
          scope.db,
          scope.householdId,
          now,
          async (context) => {
            const write = context.scope;
            const account = await accountRepository.findById(
              write,
              input.accountId,
            );
            if (!account || account.deletedAt) {
              throw new BankRequestError("unknown-account", 400);
            }
            if (!isLinkableAccount(account)) {
              throw new BankRequestError("unlinkable-account", 400);
            }
            if (provider.currency && provider.currency !== account.currency) {
              throw new BankRequestError("currency-mismatch", 400);
            }
            const connectionId = await bankLinkRepository.ensureConnection(
              write,
              lunchFlowConnectionId(scope),
            );
            const holder = await bankLinkRepository.findByProviderAccount(
              write,
              connectionId,
              provider.id,
            );
            if (holder && holder.accountId !== account.id) {
              if (!holder.deletedAt) {
                throw new BankRequestError("provider-account-linked", 409);
              }
              await bankLinkRepository.patch(write, holder.id, {
                providerAccountId: `released:${holder.id}`,
              });
            }

            const fields = {
              connectionId,
              providerAccountId: provider.id,
              providerName: provider.name,
              providerInstitution: provider.institution,
              currency: account.currency,
              signMultiplier: input.signMultiplier,
              status: "active",
              lastError: null,
              deletedAt: null,
            };
            const existing = await bankLinkRepository.findByAccountId(
              write,
              account.id,
            );
            let linkId: string;
            if (existing) {
              linkId = existing.id;
              const moved = existing.providerAccountId !== provider.id;
              await bankLinkRepository.patch(write, existing.id, {
                ...fields,
                ...(moved
                  ? {
                      lastSyncedOn: null,
                      bankBalanceMinor: null,
                      bankBalanceOn: null,
                      bankRowsWaiting: false,
                    }
                  : {}),
              });
            } else {
              linkId = randomUUID();
              await bankLinkRepository.insert(write, {
                id: linkId,
                accountId: account.id,
                ...fields,
              });
            }
            await reconciliation.onAccountLinked(write, account.id);
            context.markWritten();
            const link = await bankLinkRepository.findById(write, linkId);
            if (!link) throw new Error("The Bank link was not written");
            return toView(link);
          },
        );
        return financeJson(result);
      },
      { write: true, owner: true },
    ),

    /** `DELETE /api/bank/links?linkId=…`: removes a link; its bank rows stay. */
    removeLink: guarded(
      async (request, _session, scope) => {
        const parsed = linkIdSchema.safeParse({
          linkId: new URL(request.url).searchParams.get("linkId"),
        });
        if (!parsed.success) return failure("invalid-body", 400);
        const input = parsed.data;
        const now = dependencies.now();
        await runServerWrite(
          scope.db,
          scope.householdId,
          now,
          async (context) => {
            const link = await bankLinkRepository.findById(
              context.scope,
              input.linkId,
            );
            if (!link || link.deletedAt) {
              throw new BankRequestError("not-found", 404);
            }
            await bankLinkRepository.patch(context.scope, link.id, {
              deletedAt: now,
              status: "removed",
            });
            context.markWritten();
          },
        );
        return financeNoContent();
      },
      { write: true, owner: true },
    ),

    /**
     * `POST /api/bank/sync-now`: syncs every link of the Household
     * now, and labels the new bank rows after the response. 429 `rate_limited` when the bank provider refused every link (it
     * allows a few pulls per account a day), 429 `too-many-requests` when the
     * Household asked too often.
     */
    syncNow: guarded(
      async (_request, _session, scope) => {
        const now = dependencies.now();
        const connection = await connectedClient(scope, now);
        const links = await syncBankLinks({
          db: scope.db,
          householdId: scope.householdId,
          client: connection.client,
          now,
        });
        dependencies.afterResponse(async () => {
          await processBankRows({
            db: scope.db,
            householdId: scope.householdId,
            model: dependencies.getModel(),
            now,
            clock: dependencies.now,
          });
        });
        if (
          links.length > 0 &&
          links.every((link) => link.error === "rate_limited")
        ) {
          return failure("rate_limited", 429);
        }
        const household = await withHousehold(
          scope.db,
          scope.householdId,
          (read) => householdRepository.find(read),
        );
        return financeJson({
          links,
          clock: household?.clock ?? 0,
        } satisfies SyncNowResponse);
      },
      {
        write: true,
        owner: true,
        rateLimit: { bucket: "bank-sync", per: "household" },
      },
    ),

    /**
     * `GET /api/bank/unbacked-entries?linkId=…`: the Entries behind
     * the link's balance difference, which no bank row backs.
     */
    listUnbackedEntries: guarded(
      async (request, _session, scope) => {
        const parsed = linkIdSchema.safeParse({
          linkId: new URL(request.url).searchParams.get("linkId"),
        });
        if (!parsed.success) return failure("invalid-body", 400);
        const unbacked = await withHousehold(
          scope.db,
          scope.householdId,
          (read) => balanceCheck.unbackedEntries(read, parsed.data.linkId),
        );
        const entryIds = unbacked.map((entry) => entry.id);
        return financeJson({ entryIds } satisfies UnbackedEntriesResponse);
      },
      { write: false },
    ),

    /**
     * `PUT /api/bank/kept-transactions`: a Member keeps a Transaction
     * behind the link's balance difference, so the balance check stops
     * listing it. The link takes a new version, so every client reads the
     * list again.
     */
    keepTransaction: guarded(
      async (request, _session, scope) => {
        const input = await readFinanceBody(request, keptTransactionSchema);
        if (input instanceof Response) return input;
        const { linkId, transactionId } = input;
        await runServerWrite(
          scope.db,
          scope.householdId,
          dependencies.now(),
          (context) => balanceCheck.keep(context, linkId, transactionId),
        );
        return financeNoContent();
      },
      { write: true },
    ),

    /** `DELETE /api/bank/kept-transactions?linkId=…&transactionId=…`: undoes `keepTransaction`. */
    unkeepTransaction: guarded(
      async (request, _session, scope) => {
        const params = new URL(request.url).searchParams;
        const parsed = keptTransactionSchema.safeParse({
          linkId: params.get("linkId"),
          transactionId: params.get("transactionId"),
        });
        if (!parsed.success) return failure("invalid-body", 400);
        const { linkId, transactionId } = parsed.data;
        await runServerWrite(
          scope.db,
          scope.householdId,
          dependencies.now(),
          (context) => balanceCheck.unkeep(context, linkId, transactionId),
        );
        return financeNoContent();
      },
      { write: true },
    ),
  };
}

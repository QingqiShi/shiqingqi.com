import { randomUUID } from "node:crypto";
import type { LanguageModel } from "ai";
import { z } from "zod";
import type { FinanceSession } from "../auth/types.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import { bankLinkRepository } from "../db/repositories/bank-link-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import type { FinanceDb } from "../db/types.ts";
import { LINKABLE_KINDS } from "../domain/accounts/linkable-kinds.ts";
import { FINANCE_NO_STORE, financeJson } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardOptions,
} from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import type { LimitFinanceRequest } from "../http/types.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { accountMutations } from "../sync/account-mutations.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { BankError } from "./lunchflow/bank-error.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import type {
  BankApiErrorCode,
  BankConnection,
  BankLinkView,
  ProviderAccountsResponse,
  SyncNowResponse,
} from "./types.ts";

export interface BankHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  getBankClient: (scope: RepositoryScope, now: Date) => Promise<BankConnection>;
  getModel: () => LanguageModel | null;
  now: () => Date;
  limitRequest?: LimitFinanceRequest;
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
const removeLinkSchema = z.object({ linkId: z.uuid() });
const resolveBalanceSchema = z.object({
  linkId: z.uuid(),
  action: z.enum(["use", "dismiss"]),
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
 * The Connections settings and Review routes under `/api/finance/bank/`.
 * Every route needs a session; every write also needs a same-origin
 * request. The Household always comes from the session.
 */
export function makeBankHandlers(dependencies: BankHandlerDependencies) {
  type Guarded = (
    request: Request,
    session: FinanceSession,
    scope: RepositoryScope,
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
        if (error instanceof BankError) return failure(error.kind, 502);
        throw error;
      }
    };
  }

  async function connectedClient(scope: RepositoryScope, now: Date) {
    const connection = await dependencies.getBankClient(scope, now);
    if (connection.status !== "connected") {
      throw new BankRequestError("not-connected", 409);
    }
    return connection;
  }

  return {
    /** `GET /api/finance/bank/accounts`: provider accounts with their link state. */
    listAccounts: guarded(
      async (_request, _session, scope) => {
        const connection = await dependencies.getBankClient(
          scope,
          dependencies.now(),
        );
        if (connection.status !== "connected") {
          return financeJson({
            status: "not_connected",
          } satisfies ProviderAccountsResponse);
        }
        const [accounts, connectionId, liveLinks] = await Promise.all([
          connection.client.listAccounts(),
          bankLinkRepository.findConnectionId(scope),
          bankLinkRepository.listLive(scope),
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
          accounts: accounts.map((account) => {
            const link = linkOf.get(account.id);
            return {
              providerAccountId: account.id,
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

    /** `PUT /api/finance/bank/links`: binds a cash or credit account to a provider account. */
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
            if (!LINKABLE_KINDS.has(account.kind)) {
              throw new BankRequestError("unlinkable-account", 400);
            }
            if (provider.currency && provider.currency !== account.currency) {
              throw new BankRequestError("currency-mismatch", 400);
            }
            const connectionId = await bankLinkRepository.ensureConnection(
              write,
              nameBasedUuid(`connection:${scope.householdId}:lunchflow`),
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
                      balanceDifferenceMinor: null,
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

    /** `DELETE /api/finance/bank/links?linkId=…`: removes a link; its bank rows stay. */
    removeLink: guarded(
      async (request, _session, scope) => {
        const parsed = removeLinkSchema.safeParse({
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
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": FINANCE_NO_STORE },
        });
      },
      { write: true, owner: true },
    ),

    /**
     * `POST /api/finance/bank/sync-now`: syncs every link of the Household
     * now. 429 `rate_limited` when the bank provider refused every link (it
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
          model: dependencies.getModel(),
          now,
        });
        if (
          links.length > 0 &&
          links.every((link) => link.error === "rate_limited")
        ) {
          return failure("rate_limited", 429);
        }
        const household = await householdRepository.find(scope);
        return financeJson({
          links,
          clock: household?.clock ?? 0,
        } satisfies SyncNowResponse);
      },
      {
        write: true,
        rateLimit: { bucket: "bank-sync", per: "household" },
      },
    ),

    /** `POST /api/finance/bank/balance`: takes the bank balance as a Valuation, or dismisses the difference. */
    resolveBalance: guarded(
      async (request, _session, scope) => {
        const input = await readFinanceBody(request, resolveBalanceSchema);
        if (input instanceof Response) return input;
        const now = dependencies.now();
        const { clock } = await runServerWrite(
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
            if (input.action === "use") {
              if (
                link.bankBalanceMinor === null ||
                link.bankBalanceOn === null
              ) {
                throw new BankRequestError("no-bank-balance", 409);
              }
              await accountMutations.putValuation(
                context,
                {
                  id: randomUUID(),
                  accountId: link.accountId,
                  on: link.bankBalanceOn,
                  amountMinor: link.bankBalanceMinor,
                },
                "bank",
              );
            }
            await bankLinkRepository.patch(context.scope, link.id, {
              balanceDifferenceMinor: null,
            });
            context.markWritten();
          },
        );
        return financeJson({ clock });
      },
      { write: true },
    ),
  };
}

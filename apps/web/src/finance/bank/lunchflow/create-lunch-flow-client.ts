import type { z } from "zod";
import { toMinorUnits } from "../../domain/money/to-minor-units.ts";
import { BankError } from "./bank-error.ts";
import { lunchFlowSchemas } from "./lunch-flow-schemas.ts";
import type {
  BankClient,
  BankErrorKind,
  ProviderTransaction,
  TransactionRange,
} from "./types.ts";

const LUNCH_FLOW_BASE_URL = "https://www.lunchflow.app/api/v1";

const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

interface LunchFlowClientOptions {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
  /** How many times a 429 or 5xx is tried again. */
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** The delay a `Retry-After` header asks for, in seconds or as an HTTP date. */
function retryAfterMs(header: string | null, now: number) {
  if (header === null) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

function kindOfStatus(status: number, body: string): BankErrorKind {
  if (status === 429 || body.includes("RateLimited")) return "rate_limited";
  if (status === 400) return "reconnect";
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  return "unavailable";
}

/** GoCardless allows about four pulls per account a day; a retry in seconds cannot help. */
function isDailyBankCap(body: string) {
  return body.includes("GCRateLimited");
}

function isRetryable(status: number) {
  return status === 429 || status >= 500;
}

function errorMessage(body: string, status: number) {
  try {
    const parsed = lunchFlowSchemas.error.safeParse(JSON.parse(body));
    if (parsed.success) {
      return parsed.data.message ?? parsed.data.error;
    }
  } catch {
    // The body is not JSON; the status says enough.
  }
  return `Lunch Flow answered ${String(status)}`;
}

/** The Lunch Flow Personal API. Amounts become minor units here and nowhere else. */
export function createLunchFlowClient(
  options: LunchFlowClientOptions,
): BankClient {
  const fetch = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? LUNCH_FLOW_BASE_URL;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const sleep = options.sleep ?? defaultSleep;

  async function get<Schema extends z.ZodType>(
    path: string,
    schema: Schema,
  ): Promise<z.infer<Schema>> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}${path}`, {
          headers: { "x-api-key": options.apiKey, Accept: "application/json" },
        });
      } catch (error) {
        if (attempt < retries) {
          await sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
        throw new BankError(
          "unavailable",
          error instanceof Error ? error.message : "Lunch Flow is unreachable",
        );
      }

      const body = await response.text();
      if (response.ok) {
        let json: unknown;
        try {
          json = JSON.parse(body);
        } catch {
          throw new BankError("unavailable", "Lunch Flow sent no JSON");
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          throw new BankError(
            "unavailable",
            "Lunch Flow sent an unexpected response",
          );
        }
        return parsed.data;
      }

      const asked = retryAfterMs(
        response.headers.get("Retry-After"),
        Date.now(),
      );
      if (
        isRetryable(response.status) &&
        attempt < retries &&
        !isDailyBankCap(body) &&
        (asked === undefined || asked <= MAX_DELAY_MS)
      ) {
        await sleep(asked ?? BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw new BankError(
        kindOfStatus(response.status, body),
        errorMessage(body, response.status),
        response.status,
      );
    }
  }

  function accountPath(providerAccountId: string, rest: string) {
    return `/accounts/${encodeURIComponent(providerAccountId)}/${rest}`;
  }

  return {
    async listAccounts() {
      const body = await get("/accounts", lunchFlowSchemas.accounts);
      return body.accounts.map((account) => ({
        id: account.id,
        connectionId: account.connection_id,
        name: account.name,
        institution: account.institution_name,
        institutionLogo: account.institution_logo,
        provider: account.provider,
        currency: account.currency ?? null,
        status: account.status ?? null,
      }));
    },

    async listTransactions(providerAccountId: string, range: TransactionRange) {
      const query = new URLSearchParams({
        include_pending: "false",
        from: range.from,
      });
      if (range.to) query.set("to", range.to);
      const body = await get(
        accountPath(providerAccountId, `transactions?${query.toString()}`),
        lunchFlowSchemas.transactions,
      );
      const posted: ProviderTransaction[] = [];
      for (const row of body.transactions) {
        if (row.id === null || row.isPending === true) continue;
        posted.push({
          id: row.id,
          date: row.date,
          amountMinor: toMinorUnits(row.amount, row.currency),
          currency: row.currency,
          merchant: row.merchant?.trim() ?? "",
          description: row.description?.trim() ?? "",
          raw: row,
        });
      }
      return posted;
    },

    async getBalance(providerAccountId: string) {
      const body = await get(
        accountPath(providerAccountId, "balance"),
        lunchFlowSchemas.balance,
      );
      return {
        amountMinor: toMinorUnits(body.balance.amount, body.balance.currency),
        currency: body.balance.currency,
      };
    },
  };
}

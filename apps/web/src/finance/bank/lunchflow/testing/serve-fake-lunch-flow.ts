import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

export interface FakeLunchFlowAccount {
  id: number;
  connection_id: number;
  name: string;
  institution_name: string;
  institution_logo: string | null;
  provider: string;
  currency?: string;
  status?: string;
  /** Answers 400 on transactions and balance, as an expired bank connection does. */
  expired?: boolean;
  transactions: {
    id: string | null;
    amount: number;
    currency: string;
    date: string;
    merchant?: string;
    description?: string;
    isPending?: boolean;
  }[];
  balance: { amount: number; currency: string };
}

export interface ScriptedResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface FakeLunchFlowServer {
  baseUrl: string;
  /** The served accounts; a test may change them between calls. */
  accounts: FakeLunchFlowAccount[];
  /** Every request path with its query, in order. */
  requests: string[];
  /** Answers the next requests with these responses, one each, before the normal routes. */
  script: ScriptedResponse[];
  close: () => Promise<void>;
}

const API_PREFIX = "/api/v1";

function send(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function inRange(date: string, from: string | null, to: string | null) {
  return (from === null || date >= from) && (to === null || date <= to);
}

/**
 * A local HTTP server that answers like the Lunch Flow Personal API
 * (`lf/openapi.json`): `x-api-key` auth, the account list, transactions with
 * `include_pending`/`from`/`to`, balances, and the documented error bodies.
 */
export async function serveFakeLunchFlow(options: {
  apiKey: string;
  accounts: FakeLunchFlowAccount[];
}): Promise<FakeLunchFlowServer> {
  const requests: string[] = [];
  const script: ScriptedResponse[] = [];
  const state = { accounts: [...options.accounts], requests, script };

  function handle(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? "/", "http://localhost");
    state.requests.push(`${url.pathname}${url.search}`);

    const scripted = state.script.shift();
    if (scripted) {
      send(response, scripted.status, scripted.body ?? {}, scripted.headers);
      return;
    }

    const key = request.headers["x-api-key"];
    if (key === undefined) {
      send(response, 401, {
        error: "Unauthorized",
        message:
          "Authentication required. Provide x-api-key header or Authorization: Bearer token.",
      });
      return;
    }
    if (key !== options.apiKey) {
      send(response, 403, {
        error: "Forbidden",
        message: "Invalid credentials.",
      });
      return;
    }
    if (request.method !== "GET" || !url.pathname.startsWith(API_PREFIX)) {
      send(response, 404, { error: "Not Found", message: "No such route" });
      return;
    }

    const path = url.pathname.slice(API_PREFIX.length);
    if (path === "/accounts") {
      send(response, 200, {
        accounts: state.accounts.map((account) => ({
          id: account.id,
          connection_id: account.connection_id,
          name: account.name,
          institution_name: account.institution_name,
          institution_logo: account.institution_logo,
          provider: account.provider,
          currency: account.currency,
          status: account.status,
        })),
        total: state.accounts.length,
      });
      return;
    }

    const match = /^\/accounts\/([^/]+)\/(transactions|balance)$/.exec(path);
    const account = match
      ? state.accounts.find((candidate) => String(candidate.id) === match[1])
      : undefined;
    if (!match || !account) {
      send(response, 404, {
        error: "Not Found",
        message: "Account not found",
      });
      return;
    }
    if (account.expired) {
      send(response, 400, {
        error: "Bad Request",
        message: "Bank connection expired, user must reconnect",
      });
      return;
    }
    if (match[2] === "balance") {
      send(response, 200, { balance: account.balance });
      return;
    }
    const includePending = url.searchParams.get("include_pending") === "true";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const transactions = account.transactions
      .filter((row) => includePending || row.isPending !== true)
      .filter((row) => inRange(row.date, from, to))
      .map((row) => ({ ...row, accountId: account.id }));
    send(response, 200, { transactions, total: transactions.length });
  }

  const server = createServer(handle);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The fake Lunch Flow server has no port");
  }
  const { port } = address satisfies AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${String(port)}${API_PREFIX}`,
    accounts: state.accounts,
    requests: state.requests,
    script: state.script,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

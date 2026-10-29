import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BankError } from "./bank-error.ts";
import { createLunchFlowClient } from "./create-lunch-flow-client.ts";
import {
  serveFakeLunchFlow,
  type FakeLunchFlowAccount,
  type FakeLunchFlowServer,
} from "./testing/serve-fake-lunch-flow.ts";

const API_KEY = "test-key";

function account(
  overrides: Partial<FakeLunchFlowAccount> = {},
): FakeLunchFlowAccount {
  return {
    id: 101,
    connection_id: 7,
    name: "Everyday",
    institution_name: "Example Bank",
    institution_logo: null,
    provider: "gocardless",
    currency: "GBP",
    status: "ACTIVE",
    transactions: [
      {
        id: "tx-1",
        amount: -12.34,
        currency: "GBP",
        date: "2026-10-01",
        merchant: "Tesco",
        description: "TESCO STORES 3297",
      },
      {
        id: "tx-2",
        amount: 2500,
        currency: "GBP",
        date: "2026-10-05",
        description: "SALARY",
      },
      {
        id: null,
        amount: -3.5,
        currency: "GBP",
        date: "2026-10-06",
        merchant: "Pret",
        isPending: true,
      },
    ],
    balance: { amount: 1024.5, currency: "GBP" },
    ...overrides,
  };
}

let server: FakeLunchFlowServer;
let sleeps: number[];

beforeEach(async () => {
  server = await serveFakeLunchFlow({ apiKey: API_KEY, accounts: [account()] });
  sleeps = [];
});

afterEach(async () => {
  await server.close();
});

function client(apiKey = API_KEY) {
  return createLunchFlowClient({
    apiKey,
    baseUrl: server.baseUrl,
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  });
}

async function bankErrorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof BankError) return error;
    throw error;
  }
  throw new Error("Expected a BankError");
}

describe("createLunchFlowClient", () => {
  it("lists accounts with string ids", async () => {
    expect(await client().listAccounts()).toEqual([
      {
        id: "101",
        bankLoginId: "7",
        name: "Everyday",
        institution: "Example Bank",
        institutionLogo: null,
        provider: "gocardless",
        currency: "GBP",
        status: "ACTIVE",
      },
    ]);
  });

  it("converts amounts to minor units and drops pending rows", async () => {
    const rows = await client().listTransactions("101", { from: "2026-09-01" });
    expect(rows.map((row) => [row.id, row.amountMinor, row.merchant])).toEqual([
      ["tx-1", -1234, "Tesco"],
      ["tx-2", 250_000, ""],
    ]);
    expect(server.requests.at(-1)).toBe(
      "/api/v1/accounts/101/transactions?include_pending=false&from=2026-09-01",
    );
  });

  it("reads the balance in minor units", async () => {
    expect(await client().getBalance("101")).toEqual({
      amountMinor: 102_450,
      currency: "GBP",
    });
  });

  it("maps a missing or wrong key to auth without a retry", async () => {
    const error = await bankErrorOf(client("wrong").listAccounts());
    expect(error.kind).toBe("auth");
    expect(server.requests).toHaveLength(1);
  });

  it("maps an expired connection to reconnect", async () => {
    server.accounts[0] = account({ expired: true });
    const error = await bankErrorOf(
      client().listTransactions("101", { from: "2026-09-01" }),
    );
    expect(error.kind).toBe("reconnect");
    expect(error.message).toContain("reconnect");
    expect(server.requests).toHaveLength(1);
  });

  it("maps an unknown account to not_found", async () => {
    const error = await bankErrorOf(client().getBalance("999"));
    expect(error.kind).toBe("not_found");
  });

  it("rejects a body that breaks the spec", async () => {
    server.script.push({ status: 200, body: { accounts: "nope" } });
    const error = await bankErrorOf(client().listAccounts());
    expect(error.kind).toBe("unavailable");
  });
});

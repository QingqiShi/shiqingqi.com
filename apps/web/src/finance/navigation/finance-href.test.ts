import { describe, expect, it } from "vitest";
import {
  financeHref,
  readNetWorth,
  readNewTransaction,
} from "./finance-href.ts";

const ACCOUNT = "00000000-0000-4000-8000-0000000000c1";

describe("financeHref", () => {
  it("writes Net worth's account, its Transaction and its mode, and a Transaction needs an account", () => {
    expect(
      financeHref({ screen: "netWorth", account: ACCOUNT, tx: "t1" }, "en"),
    ).toBe(`/finance?account=${ACCOUNT}&tx=t1`);
    expect(financeHref({ screen: "netWorth", tx: "t1" }, "en")).toBe(
      "/finance",
    );
    expect(financeHref({ screen: "netWorth", mode: "update" }, "zh")).toBe(
      "/zh/finance?mode=update",
    );
  });

  it("writes the Transactions filters through their contract, then the open Transaction", () => {
    expect(
      financeHref(
        {
          screen: "transactions",
          filters: { accountIds: [ACCOUNT], query: "tesco" },
          id: "t1",
        },
        "en",
      ),
    ).toBe(`/finance/transactions?account=${ACCOUNT}&q=tesco&id=t1`);
  });

  it("puts a new Transaction over a screen, and over the screen that shows as it is", () => {
    expect(
      financeHref(
        {
          screen: "netWorth",
          account: ACCOUNT,
          newTransaction: { kind: "expense", refundOf: "t1" },
        },
        "en",
      ),
    ).toBe(`/finance?account=${ACCOUNT}&new=expense&refund=t1`);
    expect(
      financeHref(
        { screen: "current", newTransaction: { kind: "income" } },
        "en",
        { pathname: "/finance/reports/r1", search: "?new=expense&refund=t1" },
      ),
    ).toBe("/finance/reports/r1?new=income");
  });
});

describe("the readers", () => {
  it("read back what financeHref writes", () => {
    const href = financeHref(
      {
        screen: "netWorth",
        account: ACCOUNT,
        tx: "t1",
        mode: "reorder",
        newTransaction: { kind: "transfer" },
      },
      "en",
    );
    const params = new URL(href, "https://qingqi.dev").searchParams;
    expect(readNetWorth(params)).toEqual({
      account: ACCOUNT,
      tx: "t1",
      mode: "reorder",
    });
    expect(readNewTransaction(params)).toEqual({
      kind: "transfer",
      refundOf: null,
    });
  });

  it("drop what they cannot read", () => {
    const params = new URLSearchParams("tx=t1&mode=edit&new=gift");
    expect(readNetWorth(params)).toEqual({
      account: null,
      tx: null,
      mode: null,
    });
    expect(readNewTransaction(params)).toBeNull();
  });
});

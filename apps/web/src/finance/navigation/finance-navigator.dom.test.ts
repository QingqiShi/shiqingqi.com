import { beforeEach, describe, expect, it } from "vitest";
import { nextPopState } from "#src/testing/next-pop-state.ts";
import { financeNavigator } from "./finance-navigator.ts";

const ACCOUNT = "00000000-0000-4000-8000-0000000000c1";

function setUp(locale: "en" | "zh" = "en") {
  const navigations: { kind: "push" | "replace"; href: string }[] = [];
  const navigator = financeNavigator(
    {
      push: (href) => {
        navigations.push({ kind: "push", href });
      },
      replace: (href) => {
        navigations.push({ kind: "replace", href });
      },
    },
    locale,
  );
  return { navigator, navigations };
}

function here() {
  return `${window.location.pathname}${window.location.search}`;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/finance");
});

describe("financeNavigator", () => {
  it("opens a transaction from an account, and its close returns to the account", async () => {
    const { navigator } = setUp();
    navigator.push({ screen: "netWorth", account: ACCOUNT });
    const entries = window.history.length;

    navigator.open({ screen: "netWorth", account: ACCOUNT, tx: "t1" });
    expect(here()).toBe(`/finance?account=${ACCOUNT}&tx=t1`);
    expect(window.history.length).toBe(entries + 1);

    const popped = nextPopState();
    navigator.close({ screen: "netWorth", account: ACCOUNT });
    await popped;
    expect(here()).toBe(`/finance?account=${ACCOUNT}`);
  });

  it("keeps the opened mark through a replace, so the close still goes back", async () => {
    const { navigator } = setUp();
    window.history.replaceState(null, "", "/finance/transactions");

    navigator.open({ screen: "transactions", id: "t1" });
    navigator.replace({ screen: "transactions", id: "t2" });
    expect(here()).toBe("/finance/transactions?id=t2");

    const popped = nextPopState();
    navigator.close({ screen: "transactions" });
    await popped;
    expect(here()).toBe("/finance/transactions");
  });

  it("replaces an entry that it did not open, so no entry stays behind the screen", () => {
    const { navigator } = setUp();
    navigator.push({ screen: "netWorth", account: ACCOUNT, tx: "t1" });
    const entries = window.history.length;

    navigator.close({ screen: "netWorth", account: ACCOUNT });

    expect(here()).toBe(`/finance?account=${ACCOUNT}`);
    expect(window.history.length).toBe(entries);
  });

  it("opens a new Transaction over the screen as it is, and its close leaves the screen as it was", async () => {
    const { navigator } = setUp();
    window.history.replaceState(null, "", "/finance/analytics?range=12M");

    navigator.open({
      screen: "current",
      newTransaction: { kind: "expense", refundOf: "t1" },
    });
    expect(here()).toBe("/finance/analytics?range=12M&new=expense&refund=t1");

    const popped = nextPopState();
    navigator.close({ screen: "current" });
    await popped;
    expect(here()).toBe("/finance/analytics?range=12M");
  });

  it("leaves another screen to the router, in the page's locale", () => {
    const { navigator, navigations } = setUp("zh");
    window.history.replaceState(null, "", "/zh/finance");

    navigator.push({ screen: "transactions", filters: { review: true } });
    navigator.replace({ screen: "transactions", id: "t1" });

    expect(navigations).toEqual([
      { kind: "push", href: "/zh/finance/transactions?review=1" },
      { kind: "replace", href: "/zh/finance/transactions?id=t1" },
    ]);
    expect(here()).toBe("/zh/finance");
  });
});

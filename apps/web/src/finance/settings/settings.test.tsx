import { isDeepStrictEqual } from "node:util";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  screen,
  userEvent,
  waitFor,
  within,
} from "#src/testing/test-utils.tsx";
import type { ProviderAccountsResponse } from "../bank/types.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { CategoriesSettings } from "./categories-settings.tsx";
import { ConnectionsSettings } from "./connections-settings.tsx";
import { ExchangeRatesSettings } from "./exchange-rates-settings.tsx";
import { GroupsSettings } from "./groups-settings.tsx";
import { HouseholdSettings } from "./household-settings.tsx";
import { MembersSettings } from "./members-settings.tsx";
import { PayeesSettings } from "./payees-settings.tsx";
import { RulesSettings } from "./rules-settings.tsx";
import { SettingsSignedInMember } from "./settings-signed-in-member.tsx";
import { TagsSettings } from "./tags-settings.tsx";
import {
  createSettingsReplica,
  SETTINGS_IDS,
} from "./testing/create-settings-replica.ts";
import { renderWithSettingsReplica } from "./testing/render-with-settings-replica.tsx";

const ids = SETTINGS_IDS;

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Route = (body: unknown) => { status?: number; json?: unknown };

/** Answers the Finance routes the screen calls, by "METHOD /path", and records each call. */
function stubFinanceApi(routes: Record<string, Route>) {
  const calls: { route: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
    const url = new URL(input, "http://localhost");
    const route = `${init.method ?? "GET"} ${url.pathname}`;
    const body: unknown =
      typeof init.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ route, body });
    if (!(route in routes)) {
      return Promise.reject(new Error(`offline: ${route}`));
    }
    const handler = routes[route];
    const answer = handler(body);
    return Promise.resolve(
      new Response(
        answer.json === undefined ? null : JSON.stringify(answer.json),
        { status: answer.status ?? 200 },
      ),
    );
  });
  return calls;
}

/**
 * Opens an edit sheet and waits until focus is in it. The sheet moves focus
 * to its first field on the next animation frame. If a test types before
 * that frame, the frame moves focus and the text goes into the wrong field.
 */
async function openSheet(trigger: HTMLElement) {
  await userEvent.click(trigger);
  const sheet = await screen.findByRole("dialog");
  await waitFor(() => {
    expect(sheet.contains(document.activeElement)).toBe(true);
  });
}

const providerAccounts: ProviderAccountsResponse = {
  status: "connected",
  mode: "fake",
  credential: { lastFour: "wxyz", savedAt: "2026-10-01T09:00:00Z" },
  accounts: [
    {
      providerAccountId: "fake-visa",
      name: "Alex Visa",
      institution: "Northbank",
      institutionLogo: null,
      currency: "GBP",
      needsReconnect: false,
      link: null,
    },
    {
      providerAccountId: "fake-current",
      name: "Current account",
      institution: "Monzo",
      institutionLogo: null,
      currency: "GBP",
      needsReconnect: false,
      link: {
        id: "link-current",
        accountId: ids.current,
        signMultiplier: 1,
        status: "active",
        lastSyncedOn: "2026-10-01",
        lastSyncAt: "2026-10-01T04:15:00.000Z",
        lastError: null,
      },
    },
  ],
};

describe("Settings", () => {
  it("shows the signed-in Member, the Household, the sync status and sign out", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <SettingsSignedInMember />, {
      memberId: ids.sam,
    });

    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Not synced yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("adds a tag", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <TagsSettings />);
    await openSheet(screen.getByRole("button", { name: "Tag" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Name" }),
      "Holiday",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const [mutation] = runtime.store.takeOutbox();
    expect(mutation).toMatchObject({
      name: "upsertTag",
      args: { name: "Holiday", position: 0 },
    });
    expect(screen.getByRole("button", { name: /Holiday/ })).toBeInTheDocument();
  });

  it("moves a group down by renumbering its side", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <GroupsSettings />);
    await userEvent.click(
      screen.getByRole("button", { name: "Move down: Cash" }),
    );

    expect(runtime.store.takeOutbox()).toEqual([
      expect.objectContaining({
        name: "upsertGroup",
        args: { id: ids.savings, position: 0 },
      }),
      expect.objectContaining({
        name: "upsertGroup",
        args: { id: ids.cash, position: 1 },
      }),
    ]);
    const assets = liveRowSelectors
      .accountGroups(runtime.store.getSnapshot())
      .filter((group) => group.side === "asset")
      .map((group) => group.name);
    expect(assets).toEqual(["Savings", "Cash"]);
  });

  it("moves a category under another and archives it", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <CategoriesSettings />);
    await openSheet(screen.getByRole("button", { name: /Eating out/ }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Parent" }),
      ids.groceries,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: /Archived/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const [mutation] = runtime.store.takeOutbox();
    expect(mutation).toMatchObject({
      name: "upsertCategory",
      args: { id: ids.dining, parentId: ids.groceries, archived: true },
    });
    const row = screen.getByRole("button", { name: /Eating out/ });
    expect(within(row).getByText("Archived")).toBeInTheDocument();
  });

  it("sets a payee's usual category", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <PayeesSettings />);
    await openSheet(screen.getByRole("button", { name: /TfL/ }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Usual category" }),
      ids.groceries,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const outbox = runtime.store.takeOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({
      name: "upsertPayee",
      args: { id: ids.tfl, defaultCategoryId: ids.groceries },
    });
  });

  it("adds a member, who can then get an invite link", async () => {
    const runtime = await createSettingsReplica();
    const calls = stubFinanceApi({
      "POST /api/finance/auth/invites": () => ({
        status: 201,
        json: {
          path: "/finance/invite/token",
          expiresAt: "2026-10-17T09:00:00.000Z",
          recovery: false,
        },
      }),
    });
    renderWithSettingsReplica(runtime, <MembersSettings />);
    await openSheet(screen.getByRole("button", { name: "Member" }));
    await userEvent.type(screen.getByRole("textbox", { name: /Name/ }), "Jo");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const [mutation] = runtime.store.takeOutbox();
    expect(mutation).toMatchObject({
      name: "upsertMember",
      args: { name: "Jo" },
    });
    const jo = liveRowSelectors
      .members(runtime.store.getSnapshot())
      .find((member) => member.name === "Jo");
    expect(jo).toMatchObject({ role: "member", userId: null });

    await userEvent.click(
      screen.getByRole("button", { name: "Create invite link: Jo" }),
    );
    expect(await screen.findByRole("textbox", { name: "Link" })).toHaveValue(
      "http://localhost:3000/finance/invite/token",
    );
    expect(calls.at(-1)).toEqual({
      route: "POST /api/finance/auth/invites",
      body: { memberId: jo?.id },
    });
  });

  it("offers the owner a recovery link for a member who signs in", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <MembersSettings />);
    expect(
      screen.getByRole("button", { name: "Recovery link: Kim" }),
    ).toBeInTheDocument();
  });

  it("hides owner-only changes from a member", async () => {
    const runtime = await createSettingsReplica();
    stubFinanceApi({
      "GET /api/finance/bank/accounts": () => ({ json: providerAccounts }),
    });
    const connections = renderWithSettingsReplica(
      runtime,
      <ConnectionsSettings />,
      { memberId: ids.sam },
    );
    expect(
      await screen.findByText("Only the owner can change connections."),
    ).toBeInTheDocument();
    expect(screen.getByText(`Feeds Current account`)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sync now" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "More" }),
    ).not.toBeInTheDocument();
    connections.unmount();

    const household = renderWithSettingsReplica(
      runtime,
      <HouseholdSettings />,
      {
        memberId: ids.sam,
      },
    );
    expect(
      screen.getByText("Only the owner can change the household."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    household.unmount();

    renderWithSettingsReplica(runtime, <MembersSettings />, {
      memberId: ids.sam,
    });
    expect(
      screen.queryByRole("button", { name: /Recovery link/ }),
    ).not.toBeInTheDocument();
  });

  it("links the suggested bank account in one step, then summarises a sync", async () => {
    const runtime = await createSettingsReplica();
    runtime.store.applyLocal({
      name: "createTransaction",
      args: {
        id: "00000000-0000-4000-8000-0000000000f1",
        kind: "expense",
        date: "2026-10-01",
        amountMinor: -1250,
        categoryId: ids.groceries,
        needsReview: true,
        entries: [
          {
            id: "00000000-0000-4000-8000-0000000000f2",
            accountId: ids.visa,
            amountMinor: -1250,
          },
        ],
      },
    });
    const calls = stubFinanceApi({
      "GET /api/finance/bank/accounts": () => ({ json: providerAccounts }),
      "PUT /api/finance/bank/links": () => ({ json: {} }),
      "POST /api/finance/bank/sync-now": () => ({
        json: {
          clock: 11,
          links: [
            {
              linkId: "link-visa",
              accountId: ids.visa,
              error: null,
              created: 12,
              linked: 28,
              confirmed: 2,
              missing: 0,
              balanceDifferenceMinor: null,
            },
          ],
        },
      }),
    });
    const { pushed } = renderWithSettingsReplica(
      runtime,
      <ConnectionsSettings />,
    );

    const visaCard = (
      await screen.findByText("Alex Visa", {
        selector: "span",
      })
    ).closest("li");
    if (!visaCard) throw new Error("No card for Alex Visa");
    expect(
      within(visaCard).getByRole("combobox", { name: "Feeds this account" }),
    ).toHaveValue(ids.visa);
    expect(within(visaCard).getByText("Suggested")).toBeInTheDocument();
    expect(
      within(visaCard).queryByRole("button", { name: "More" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/^Last synced 1 Oct, \d\d:\d\d$/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Demo mode: these bank accounts and transactions are made up from your own records.",
      ).tagName,
    ).not.toBe("LI");

    await userEvent.click(
      screen.getByRole("button", { name: "Link suggested (1)" }),
    );
    await waitFor(() => {
      expect(calls.map((call) => call.route)).toContain(
        "PUT /api/finance/bank/links",
      );
    });
    expect(
      calls.find((call) => call.route === "PUT /api/finance/bank/links")?.body,
    ).toEqual({
      accountId: ids.visa,
      providerAccountId: "fake-visa",
      signMultiplier: 1,
    });
    expect(await screen.findByText("Bank links saved")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sync now" }));
    expect(
      await screen.findByText("Alex Visa: 12 new, 30 matched, 1 to review"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View" }));
    expect(pushed).toEqual(["/finance/transactions?review=1"]);
  });

  it("asks the owner for a Lunch Flow API key, then shows the accounts it reads", async () => {
    const runtime = await createSettingsReplica();
    let connected = false;
    const calls = stubFinanceApi({
      "GET /api/finance/bank/accounts": () => ({
        json: connected ? providerAccounts : { status: "not_connected" },
      }),
      "PUT /api/finance/bank/credential": (body) => {
        if (!isDeepStrictEqual(body, { apiKey: "lf-good-key-wxyz" })) {
          return { status: 422, json: { error: "auth" } };
        }
        connected = true;
        return {
          json: { lastFour: "wxyz", savedAt: "2026-10-01T09:00:00Z" },
        };
      },
    });
    renderWithSettingsReplica(runtime, <ConnectionsSettings />);

    const field = await screen.findByLabelText("Lunch Flow API key");
    await userEvent.type(field, "lf-bad-key-0000");
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(
      await screen.findByText(
        "Lunch Flow did not accept this key. Copy it again from Lunch Flow.",
      ),
    ).toBeInTheDocument();

    await userEvent.clear(field);
    await userEvent.type(field, "lf-good-key-wxyz");
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("Lunch Flow connected")).toBeInTheDocument();
    expect(
      await screen.findByText(/^API key ending in wxyz · saved 1 Oct/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Alex Visa", { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      calls.filter((call) => call.route === "PUT /api/finance/bank/credential"),
    ).toEqual([
      {
        route: "PUT /api/finance/bank/credential",
        body: { apiKey: "lf-bad-key-0000" },
      },
      {
        route: "PUT /api/finance/bank/credential",
        body: { apiKey: "lf-good-key-wxyz" },
      },
    ]);
  });

  it("tells a member that the owner connects Lunch Flow", async () => {
    const runtime = await createSettingsReplica();
    stubFinanceApi({
      "GET /api/finance/bank/accounts": () => ({
        json: { status: "not_connected" },
      }),
    });
    renderWithSettingsReplica(runtime, <ConnectionsSettings />, {
      memberId: ids.sam,
    });
    expect(
      await screen.findByText("The owner connects Lunch Flow with an API key."),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Lunch Flow API key"),
    ).not.toBeInTheDocument();
  });

  it("removes the API key only after the owner confirms", async () => {
    const runtime = await createSettingsReplica();
    let connected = true;
    const calls = stubFinanceApi({
      "GET /api/finance/bank/accounts": () => ({
        json: connected ? providerAccounts : { status: "not_connected" },
      }),
      "DELETE /api/finance/bank/credential": () => {
        connected = false;
        return { status: 204 };
      },
    });
    renderWithSettingsReplica(runtime, <ConnectionsSettings />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Remove key" }),
    );
    expect(calls.map((call) => call.route)).not.toContain(
      "DELETE /api/finance/bank/credential",
    );
    expect(
      screen.getByText(
        "Bank links stay, but nothing syncs until you add a key again.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove key" }));
    expect(await screen.findByText("API key removed")).toBeInTheDocument();
    expect(
      await screen.findByLabelText("Lunch Flow API key"),
    ).toBeInTheDocument();
  });

  it("shows the sign switch only under More on a linked card", async () => {
    const runtime = await createSettingsReplica();
    stubFinanceApi({
      "GET /api/finance/bank/accounts": () => ({ json: providerAccounts }),
    });
    renderWithSettingsReplica(runtime, <ConnectionsSettings />);
    const more = await screen.findByRole("button", { name: "More" });
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    await userEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(
        "Turn on only if this account's purchases arrive as money in. Most banks and cards show purchases as negative.",
      ),
    ).toBeInTheDocument();
  });

  it("enters an exchange rate and shows it as 1 USD = … GBP", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <ExchangeRatesSettings />);
    expect(screen.getByText("1 USD = 0.75 GBP")).toBeInTheDocument();
    await openSheet(screen.getByRole("button", { name: "Update rate: USD" }));
    const rate = screen.getByRole("textbox", { name: /1 USD = \? GBP/ });
    await userEvent.clear(rate);
    await userEvent.type(rate, "0.79");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(runtime.store.takeOutbox()).toEqual([
      expect.objectContaining({
        name: "setFxRate",
        args: {
          base: "USD",
          quote: "GBP",
          on: todayInTimeZone("Europe/London"),
          rate: 0.79,
        },
      }),
    ]);
    expect(screen.getByText("1 USD = 0.79 GBP")).toBeInTheDocument();
  });

  it("adds a bank name to a payee", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <PayeesSettings />);
    await openSheet(screen.getByRole("button", { name: /TfL/ }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Add a bank name" }),
      "tfl travel ch 0042 london{Enter}",
    );
    expect(screen.getByText("TFL TRAVEL CH")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const outbox = runtime.store.takeOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({
      name: "upsertPayee",
      args: { id: ids.tfl, addAliases: ["TFL TRAVEL CH"] },
    });
    expect(
      runtime.store.getSnapshot().tables.payeeAliases.get("TFL TRAVEL CH")
        ?.payeeId,
    ).toBe(ids.tfl);
  });

  it("makes a new rule from scratch, then pauses it with Undo", async () => {
    const runtime = await createSettingsReplica();
    renderWithSettingsReplica(runtime, <RulesSettings />);
    await openSheet(screen.getByRole("button", { name: "New rule" }));
    await userEvent.type(screen.getByRole("combobox", { name: "Payee" }), "Tf");
    await userEvent.click(screen.getByRole("option", { name: /TfL/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Amount" }), "42");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Account" }),
      ids.current,
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      ids.groceries,
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: /Day of the month/ }),
      "3",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const [mutation] = runtime.store.takeOutbox();
    expect(mutation).toMatchObject({
      name: "upsertRule",
      args: {
        name: "TfL",
        unit: "month",
        interval: 1,
        dayOfMonth: 3,
        template: {
          kind: "expense",
          amountMinor: -4200,
          payeeId: ids.tfl,
          categoryId: ids.groceries,
          entries: [{ accountId: ids.current, amountMinor: -4200 }],
        },
      },
    });
    const rule = liveRowSelectors.rules(runtime.store.getSnapshot())[0];
    expect(rule.nextOn >= todayInTimeZone("Europe/London")).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Pause: TfL" }));
    expect(screen.getByText("Paused")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      liveRowSelectors.rules(runtime.store.getSnapshot())[0].pausedAt,
    ).toBeNull();
  });
});

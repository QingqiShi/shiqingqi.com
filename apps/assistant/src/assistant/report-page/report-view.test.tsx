import { render, screen } from "@testing-library/react";
import { I18nContext } from "@tuja/i18n/i18n-context";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import translations from "#src/_generated/i18n/translations.en.json";
import { morningReports, todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  insertAccount,
  insertUser,
} from "#src/assistant/mail/testing/insert-account.ts";
import { readReport } from "../report/read-report.ts";
import type {
  MorningReportContentV1,
  MorningReportContentV2,
} from "../report/types.ts";
import { ReportView } from "./report-view.tsx";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

describe("ReportView", () => {
  it("still shows a report of version 1, which has no agenda", async () => {
    const userId = await insertUser(db);
    const accountId = await insertAccount(db, userId);
    const content: MorningReportContentV1 = {
      version: 1,
      mailDate: "2026-10-31",
      status: "written",
      promptVersion: 1,
      headline: "Pay the Example invoice by Thursday.",
      needsAction: [
        {
          text: "Pay Example 120 GBP by Thursday.",
          source: { accountId, messageId: "<invoice@example.com>" },
        },
      ],
      worthKnowing: [{ text: "A parcel arrives today.", source: null }],
      rest: "Three newsletters.",
      mailCount: 12,
      leftOut: 4,
      notRead: 0,
      ranOutOfTime: false,
      unreadMailboxes: [],
    };
    await db.insert(morningReports).values({
      userId,
      localDate: "2026-11-01",
      content,
      builtAt: new Date("2026-11-01T09:00:00Z"),
    });
    const report = await readReport({ db, userId }, null);
    if (!report) throw new Error("No report");

    render(
      <I18nContext value={{ translations }}>
        <ReportView
          report={report}
          today="2026-11-01"
          openTodos={0}
          locale="en"
        />
      </I18nContext>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Pay the Example invoice by Thursday.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pay Example 120 GBP/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open mail" })).toHaveAttribute(
      "href",
      "message://%3Cinvoice%40example.com%3E",
    );
    expect(screen.getByText(/4 mails were too many/)).toBeInTheDocument();
    expect(screen.getByText("Three newsletters.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Today" })).toBeNull();
  });

  it("shows a line that needs the owner and has a to-do once, as that to-do, and lists only the other to-dos", async () => {
    const userId = await insertUser(db);
    const [report] = await db
      .insert(morningReports)
      .values({
        userId,
        localDate: "2026-11-02",
        content: {
          version: 2,
          mailDate: "2026-11-01",
          status: "written",
          headline: "Sign the lease by Wednesday.",
          needsAction: [
            {
              text: "Sign the lease renewal by Wednesday.",
              source: null,
              todoId: "00000000-0000-4000-8000-000000000001",
            },
            { text: "Your clinic appointment is on Tuesday.", source: null },
          ],
          worthKnowing: [],
          rest: null,
          agenda: null,
          mailCount: 2,
          ranOutOfTime: false,
          unreadMailboxes: [],
          doneTodos: [],
        } satisfies MorningReportContentV2,
        builtAt: new Date("2026-11-02T09:00:00Z"),
      })
      .returning();
    await db.insert(todos).values([
      {
        id: "00000000-0000-4000-8000-000000000001",
        userId,
        title: "Sign the lease renewal",
        dueDate: "2026-11-04",
        createdReportId: report.id,
      },
      { userId, title: "Pay the water bill", createdReportId: report.id },
    ]);
    const view = await readReport({ db, userId }, null);
    if (!view) throw new Error("No report");

    render(
      <I18nContext value={{ translations }}>
        <ReportView
          report={view}
          today="2026-11-02"
          openTodos={2}
          locale="en"
        />
      </I18nContext>,
    );

    expect(
      screen.getByRole("checkbox", { name: "Sign the lease renewal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Pay the water bill" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Sign the lease renewal by Wednesday."),
    ).toBeNull();
    expect(screen.getByText(/clinic appointment/)).toBeInTheDocument();
  });
});

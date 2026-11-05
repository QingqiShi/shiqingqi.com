import { MockLanguageModelV3 } from "ai/test";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  agentActions,
  agentRuns,
  mailAccounts,
  morningReports,
  todos,
} from "#src/assistant/db/schema.ts";
import { createFakeMailServer } from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  reply,
  call,
  textOf,
  reportAgent,
  failingAgent,
} from "./test-morning-report-agents.ts";
import {
  NOW,
  clock,
  db,
  userId,
  accountId,
  server,
  pushed,
  readerTexts,
  runCron,
  deliver,
  deliverDay,
  seenOf,
  insertTodos,
  setClock,
  setServer,
  setUpMorningReportCron,
} from "./test-morning-report-cron.ts";

setUpMorningReportCron();

describe("the morning report cron", () => {
  it("runs the report agent over the mail of the 24 hours before the report time and today's calendar, stores the report and the to-do changes, and then marks exactly that mail read", async () => {
    const uids = deliverDay();
    const { invoiceTodo, passportTodo } = await insertTodos();
    const agent = reportAgent();

    expect(await runCron(agent.model)).toMatchObject({
      users: 1,
      built: 1,
      pushed: 1,
    });

    expect(agent.seen.prompt).toContain(
      "The report covers every mail received from 2026-10-31 08:00 up to 2026-11-01 08:00 in the owner's time zone (2026-10-31T08:00:00.000Z to 2026-11-01T08:00:00.000Z).",
    );
    expect(agent.seen.prompt).toContain(
      '"INBOX" holds 2, 2 unread; "Archive" holds 1, 1 unread; "Newsletters" holds 1, 1 unread',
    );
    expect(agent.seen.prompt).not.toContain("Sent Messages");
    expect(agent.seen.prompt).toContain("t1: Pay the Example invoice");
    expect(agent.seen.prompt).toContain("t2: Renew the passport");
    expect(agent.seen.prompt).not.toContain("Book the dentist");
    const listed = JSON.stringify(agent.seen.listings);
    expect(listed).toContain("Invoice 42 from Example Ltd");
    expect(listed).toContain("Sent just before the report time");
    expect(listed).not.toContain("Sent at the report time");
    expect(listed).not.toContain("Sent before the window");
    expect(readerTexts.join("\n")).toContain("Please pay 120 GBP");

    const [report] = await db.select().from(morningReports);
    expect(report).toMatchObject({
      localDate: "2026-11-01",
      modelId: "agent-model",
      notifiedAt: NOW,
    });
    expect(report.content).toEqual({
      version: 2,
      mailDate: "2026-10-31",
      status: "written",
      headline: "Pay the Example invoice by Thursday.",
      needsAction: [
        {
          text: "Pay Example 120 GBP by Thursday.",
          source: { accountId, messageId: "<invoice@example.com>" },
          todoId: invoiceTodo.id,
        },
      ],
      worthKnowing: [
        {
          text: "Your new passport is on its way.",
          source: { accountId, messageId: "<passport@example.com>" },
        },
        { text: "A line about a mail the run never saw.", source: null },
      ],
      rest: null,
      agenda: [
        {
          title: "Dentist",
          allDay: false,
          start: "2026-11-01T10:00",
          end: "2026-11-01T10:30",
          timeZone: null,
          location: "High Street 4",
          note: "Bring the referral form.",
        },
      ],
      mailCount: 4,
      ranOutOfTime: false,
      unreadMailboxes: [],
      doneTodos: [
        {
          id: passportTodo.id,
          title: "Renew the passport",
          reason: "The passport office sent the new one.",
        },
      ],
      waitingTodoIds: [],
      repliedTodoIds: [],
    });
    expect(pushed).toEqual([
      {
        title: "Pay the Example invoice by Thursday.",
        body: "1 new to-do.",
        url: "/",
      },
    ]);

    const stored = await db.select().from(todos);
    expect(stored.find((todo) => todo.id === invoiceTodo.id)).toMatchObject({
      dueDate: "2026-11-05",
      doneAt: null,
    });
    expect(stored.find((todo) => todo.id === passportTodo.id)?.doneAt).toEqual(
      NOW,
    );
    expect(stored.filter((todo) => todo.createdReportId === report.id)).toEqual(
      [
        expect.objectContaining({
          title: "Send the invoice to the accountant",
          sourceAccountId: accountId,
          sourceMessageId: "<invoice@example.com>",
        }),
      ],
    );

    expect(seenOf("INBOX", uids.invoice)).toBe(true);
    expect(seenOf("Archive", uids.passport)).toBe(true);
    expect(seenOf("Newsletters", uids.newsletter)).toBe(true);
    expect(seenOf("INBOX", uids.lastIn)).toBe(true);
    expect(seenOf("INBOX", uids.late)).toBe(false);
    expect(seenOf("INBOX", uids.early)).toBe(false);
    expect(seenOf("Sent Messages", uids.mine)).toBe(false);
    const actions = await db.select().from(agentActions);
    expect(
      actions
        .filter((action) => action.kind === "mark_read")
        .map((action) => action.messageId)
        .sort(),
    ).toEqual([
      "<invoice@example.com>",
      "<last-in@example.com>",
      "<passport@example.com>",
      "<weekly@example.com>",
    ]);
    const [run] = await db.select().from(agentRuns);
    expect(
      actions
        .filter((action) => action.kind !== "mark_read")
        .map(({ kind, reason, runId }) => ({ kind, reason, runId }))
        .sort((a, b) => a.kind.localeCompare(b.kind)),
    ).toEqual([
      {
        kind: "add_todo",
        reason: "The accountant needs it.",
        runId: run.id,
      },
      {
        kind: "complete_todo",
        reason: "The passport office sent the new one.",
        runId: run.id,
      },
      {
        kind: "update_todo",
        reason: "The invoice says Thursday.",
        runId: run.id,
      },
    ]);
    expect(run).toMatchObject({ task: "report", status: "done" });

    const kept = JSON.stringify({ report, stored });
    for (const secret of ["billing@example.com", "12345678", "Please pay"]) {
      expect(kept).not.toContain(secret);
    }

    setClock(new Date("2026-11-01T10:00:00Z"));
    expect(await runCron(failingAgent())).toMatchObject({ built: 0 });
  });

  it("reads a mailbox whose server cannot move mail, and keeps saying that it cannot", async () => {
    setServer(
      createFakeMailServer({
        user: "me@icloud.com",
        password: "app-password",
        move: false,
        uidPlus: false,
      }),
    );
    server.addFolder("Archive", { specialUse: "\\Archive" });
    server.addFolder("Newsletters");
    server.addFolder("Sent Messages", { specialUse: "\\Sent" });
    const mails = deliverDay();

    expect(await runCron(reportAgent().model)).toMatchObject({ built: 1 });

    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      status: "written",
      unreadMailboxes: [],
    });
    expect(seenOf("INBOX", mails.invoice)).toBe(true);
    const [account] = await db.select().from(mailAccounts);
    expect(account).toMatchObject({
      status: "ok",
      writeErrorCode: "move_unsupported",
    });
  });

  it("stores nothing and marks no mail read while the agent submits no report, and the next hour stores the report once", async () => {
    const uids = deliverDay();
    await insertTodos();

    expect(await runCron(failingAgent())).toMatchObject({
      built: 0,
      retrying: 1,
    });
    expect(await db.$count(morningReports)).toBe(0);
    expect(await db.$count(todos)).toBe(3);
    expect(seenOf("INBOX", uids.invoice)).toBe(false);
    expect(server.log.writes).toEqual([]);
    expect(pushed).toEqual([]);

    const afterEnd = deliver(
      "INBOX",
      "<after-end@example.com>",
      "2026-11-01T09:30:00Z",
      { subject: "Came before the late build" },
    );
    setClock(new Date("2026-11-01T10:00:00Z"));
    expect(await runCron(reportAgent().model)).toMatchObject({ built: 1 });
    expect(seenOf("INBOX", afterEnd)).toBe(false);
    const [built] = await db.select().from(morningReports);
    expect(built.content).toMatchObject({ mailCount: 4 });
    setClock(new Date("2026-11-01T11:00:00Z"));
    expect(await runCron(reportAgent().model)).toMatchObject({
      built: 0,
      retrying: 0,
    });
    expect(await db.$count(morningReports)).toBe(1);
    expect(await db.$count(todos)).toBe(4);
    expect(seenOf("INBOX", uids.invoice)).toBe(true);
    expect(pushed.map((message) => message.title)).toEqual([
      "Pay the Example invoice by Thursday.",
    ]);
  });

  it("makes an agent that runs out of time submit what it has, and marks read only the window's mail of what it listed", async () => {
    const uids = deliverDay();
    const offered: string[][] = [];
    const choices: unknown[] = [];
    let lastAsk = "";
    const model = new MockLanguageModelV3({
      doGenerate: ({ prompt, toolChoice, tools }) => {
        const names = (tools ?? []).map((tool) => tool.name);
        offered.push(names);
        choices.push(toolChoice);
        lastAsk = textOf(prompt.slice(-1), "user");
        setClock(new Date(clock.getTime() + 2 * 60_000));
        if (names.length === 1) {
          return reply(
            [
              call("submit_report", {
                headline: "A first look at yesterday's mail.",
                needsAction: [],
                worthKnowing: [],
                rest: "Not all mail was read.",
              }),
            ],
            true,
          );
        }
        return reply(
          [
            call(
              "list_mail",
              { account: "a1", folder: "INBOX" },
              `list${String(offered.length)}`,
            ),
          ],
          true,
        );
      },
    });

    expect(await runCron({ id: "agent-model", model })).toMatchObject({
      built: 1,
    });
    expect(offered.at(-1)).toEqual(["submit_report"]);
    expect(choices.at(-1)).toEqual({ type: "auto" });
    expect(lastAsk).toContain("Call submit_report now");
    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      status: "written",
      headline: "A first look at yesterday's mail.",
      ranOutOfTime: true,
    });
    expect(seenOf("INBOX", uids.invoice)).toBe(true);
    expect(seenOf("INBOX", uids.late)).toBe(false);
  });

  it("retries while no mailbox can be read, and at the last try of the day stores a report that says so", async () => {
    await db.update(mailAccounts).set({ status: "reconnect" });
    deliverDay();
    const agent = reportAgent();

    expect(await runCron(agent.model)).toMatchObject({
      built: 0,
      retrying: 1,
    });
    expect(await db.$count(morningReports)).toBe(0);

    setClock(new Date("2026-11-01T23:05:00Z"));
    expect(await runCron(agent.model)).toMatchObject({
      built: 1,
      notWritten: 1,
    });
    const [report] = await db
      .select()
      .from(morningReports)
      .where(eq(morningReports.userId, userId));
    expect(report.content).toMatchObject({
      status: "failed",
      mailCount: 0,
      unreadMailboxes: [{ accountId, address: "me@icloud.com" }],
    });
    expect(agent.seen.prompt).toBe("");
    expect(pushed.map((message) => message.title)).toEqual([
      "Your morning report could not be written today",
    ]);
  });
});

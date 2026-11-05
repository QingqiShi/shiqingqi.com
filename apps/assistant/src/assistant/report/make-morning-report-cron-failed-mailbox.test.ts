import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { mailAccounts, morningReports } from "#src/assistant/db/schema.ts";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import type { MailboxConnector } from "#src/assistant/mail/imap/types.ts";
import {
  createFakeMailServer,
  type FakeMailServer,
} from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import { insertAccount } from "#src/assistant/mail/testing/insert-account.ts";
import { reportAgent } from "./test-morning-report-agents.ts";
import {
  SEEN,
  db,
  userId,
  server,
  sleeps,
  runCron,
  deliver,
  deliverDay,
  seenOf,
  setClock,
  setOnSleep,
  setUpMorningReportCron,
} from "./test-morning-report-cron.ts";

setUpMorningReportCron();

describe("the morning report cron", () => {
  describe("when one of two mailboxes fails to open", () => {
    /** The first run of the report: 08:05 in London, the default digest hour. */
    const REPORT_HOUR = new Date("2026-11-01T08:05:00Z");
    const SECOND = "you@icloud.com";
    let second: FakeMailServer;
    let secondId: string;
    let connector: MailboxConnector;

    beforeEach(async () => {
      second = createFakeMailServer({ user: SECOND, password: "app-password" });
      secondId = await insertAccount(db, userId, { address: SECOND });
      // The report agent reads account "a1". This keeps "me" first, also when the other one fails.
      await db
        .update(mailAccounts)
        .set({ lastSyncedAt: new Date("2026-12-01T00:00:00Z") })
        .where(eq(mailAccounts.id, secondId));
      connector = (host, auth) =>
        (auth.user === SECOND ? second : server).connector(host, auth);
      second.addFolder("Archive", { specialUse: "\\Archive" });
      deliverDay();
      second.failNextConnects(new Error("Login timed out"));
      setClock(REPORT_HOUR);
    });

    const secondAccount = async () =>
      (
        await db
          .select()
          .from(mailAccounts)
          .where(eq(mailAccounts.id, secondId))
      )[0];

    it("reads it at the first run when it opens on a retry, and leaves no error on it", async () => {
      setOnSleep(() => {
        second.failNextConnects(null);
      });

      expect(await runCron(reportAgent().model, connector)).toMatchObject({
        built: 1,
      });

      expect(sleeps).toHaveLength(1);
      const [report] = await db.select().from(morningReports);
      expect(report.content).toMatchObject({
        status: "written",
        unreadMailboxes: [],
      });
      expect(await secondAccount()).toMatchObject({
        status: "ok",
        lastErrorCode: null,
      });
    });

    it("stores the report on time when it stays down, and the next report also covers the mail it missed, from local midnight", async () => {
      const inSecond = (path: string, name: string, internalDate: string) =>
        deliver(
          path,
          `<${name}@example.com>`,
          internalDate,
          { subject: name },
          second,
        );
      const tooOld = inSecond("INBOX", "too-old", "2026-10-30T23:59:59Z");
      const atMidnight = inSecond(
        "INBOX",
        "at-midnight",
        "2026-10-31T00:00:00Z",
      );
      const missedInbox = inSecond("INBOX", "missed", "2026-10-31T10:00:00Z");
      const missedArchive = inSecond(
        "Archive",
        "missed-archived",
        "2026-10-31T23:30:00Z",
      );

      expect(await runCron(reportAgent().model, connector)).toMatchObject({
        built: 1,
      });

      expect(sleeps).toHaveLength(2);
      const [first] = await db.select().from(morningReports);
      expect(first.content).toMatchObject({
        status: "written",
        unreadMailboxes: [{ accountId: secondId, address: SECOND }],
      });
      expect(await secondAccount()).toMatchObject({
        status: "error",
        lastErrorCode: "sync_failed",
      });
      expect(second.log.writes).toEqual([]);

      second.failNextConnects(null);
      const newInSecond = inSecond("INBOX", "new", "2026-11-01T09:00:00Z");
      const todayInSecond = inSecond("INBOX", "today", "2026-11-02T00:10:00Z");
      const afterWindow = inSecond("INBOX", "after", "2026-11-02T08:00:00Z");
      const olderInFirst = deliver(
        "INBOX",
        "<found-late@example.com>",
        "2026-10-31T15:00:00Z",
        { subject: "Filed back into the inbox after the first report" },
      );
      setClock(new Date("2026-11-02T08:05:00Z"));
      const agent = reportAgent();

      expect(await runCron(agent.model, connector)).toMatchObject({
        built: 1,
      });

      expect(agent.seen.prompt).toContain(
        'since 2026-10-31T00:00:00.000Z: "INBOX" holds 4, 4 unread',
      );
      const secondSeen = (path: string, uid: number) =>
        second.flagsOf(path, uid).includes(SEEN);
      expect(secondSeen("INBOX", atMidnight)).toBe(true);
      expect(secondSeen("INBOX", missedInbox)).toBe(true);
      expect(secondSeen("Archive", missedArchive)).toBe(true);
      expect(secondSeen("INBOX", newInSecond)).toBe(true);
      expect(secondSeen("INBOX", tooOld)).toBe(false);
      expect(secondSeen("INBOX", todayInSecond)).toBe(true);
      expect(secondSeen("INBOX", afterWindow)).toBe(false);
      expect(seenOf("INBOX", olderInFirst)).toBe(false);
      const latest = (await db.select().from(morningReports)).find(
        (report) => report.localDate === "2026-11-02",
      );
      expect(latest?.content).toMatchObject({
        status: "written",
        unreadMailboxes: [],
        // The window's mail: "Sent at the report time", "new" and "today".
        mailCount: 3,
      });
    });

    it("does not retry a login that only a new connect can fix", async () => {
      second.failNextConnects(new MailboxAuthError());

      expect(await runCron(reportAgent().model, connector)).toMatchObject({
        built: 1,
      });

      expect(sleeps).toEqual([]);
      const [report] = await db.select().from(morningReports);
      expect(report.content).toMatchObject({
        status: "written",
        unreadMailboxes: [{ accountId: secondId, address: SECOND }],
      });
      expect(await secondAccount()).toMatchObject({ status: "reconnect" });
    });
  });
});

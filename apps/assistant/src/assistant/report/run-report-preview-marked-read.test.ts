import { describe, expect, it } from "vitest";
import { agentActions, morningReports } from "#src/assistant/db/schema.ts";
import {
  openReportMailboxes,
  runReportOverMailboxes,
} from "./build-morning-report.ts";
import { readReportSettings } from "./read-report-settings.ts";
import {
  NOW,
  readerModel,
  listingAgent,
} from "./test-report-preview-agents.ts";
import {
  db,
  userId,
  accountId,
  invoiceUid,
  server,
  buildDeps,
  start,
  deliverRead,
  previewRow,
  setUpReportPreview,
} from "./test-report-preview.ts";

setUpReportPreview();

describe("a preview of the next morning report", () => {
  describe("with mail that a real report marked read", () => {
    const MARKED_AT = new Date("2026-11-01T12:00:00Z");
    const RECEIVED_AT = new Date("2026-11-01T09:00:00Z");
    const deliverMail = async () => ({
      marked: await deliverRead("Marked", RECEIVED_AT, {
        createdAt: MARKED_AT,
      }),
      ownerRead: await deliverRead("Owner-read", RECEIVED_AT),
      undone: await deliverRead("Undone", RECEIVED_AT, {
        createdAt: MARKED_AT,
        undoneAt: new Date("2026-11-01T13:00:00Z"),
      }),
    });

    it("shows that mail unread to a preview's agent, and no other read mail, and changes no flag", async () => {
      const uids = await deliverMail();
      const actionsBefore = await db.select().from(agentActions);
      const agent = listingAgent();

      expect(await start(buildDeps(agent.model))).toBe(204);

      expect(agent.seen.listed).toEqual(
        new Map([
          ["Invoice 42", true],
          ["Marked", true],
          ["Owner-read", false],
          ["Undone", false],
        ]),
      );
      expect(agent.seen.unreadOnly).toEqual(["Invoice 42", "Marked"]);
      expect(agent.seen.prompt).toContain("holds 4, 2 unread");

      expect((await previewRow()).status).toBe("done");
      expect(server.log.writes).toEqual([]);
      expect(server.flagsOf("INBOX", uids.marked)).toEqual(["\\Seen"]);
      expect(server.flagsOf("INBOX", uids.ownerRead)).toEqual(["\\Seen"]);
      expect(server.flagsOf("INBOX", invoiceUid)).toEqual([]);
      expect(await db.select().from(agentActions)).toEqual(actionsBefore);
    });

    it("leaves that mail read for a real report", async () => {
      await deliverMail();
      const agent = listingAgent();
      const deps = buildDeps(agent.model);
      const mailboxes = await openReportMailboxes({ db, userId }, deps);
      const mailWindow = {
        start: new Date("2026-10-31T15:42:00Z"),
        end: NOW,
      };
      const settings = await readReportSettings({ db, userId });
      try {
        await runReportOverMailboxes(
          { db, userId, endsAt: NOW.getTime() + 600_000 },
          { ...deps, models: { agent: agent.model, reader: readerModel() } },
          {
            mailboxes,
            settings,
            today: "2026-11-02",
            mailWindow,
            mailStart: () => mailWindow.start,
            task: "report",
          },
        );
      } finally {
        await mailboxes.finish();
      }

      expect(agent.seen.listed.get("Marked")).toBe(false);
      expect(agent.seen.unreadOnly).toEqual(["Invoice 42"]);
      expect(agent.seen.prompt).toContain("holds 4, 1 unread");
    });

    it("reaches back to the catch-up start of a missed mailbox", async () => {
      await db.insert(morningReports).values({
        userId,
        localDate: "2026-10-29",
        content: {
          version: 2,
          mailDate: "2026-10-28",
          status: "written",
          headline: "Yesterday",
          needsAction: [],
          worthKnowing: [],
          rest: null,
          agenda: null,
          mailCount: 0,
          ranOutOfTime: false,
          unreadMailboxes: [{ accountId, address: "me@icloud.com" }],
          doneTodos: [],
        },
        builtAt: new Date("2026-10-29T08:00:00Z"),
      });
      await deliverRead("Old", new Date("2026-10-28T03:00:00Z"), {
        createdAt: new Date("2026-10-28T08:00:00Z"),
      });
      const agent = listingAgent();

      expect(await start(buildDeps(agent.model))).toBe(204);

      expect(agent.seen.prompt).toContain("holds 2, 2 unread");
    });
  });
});

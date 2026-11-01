import { describe, expect, it } from "vitest";
import {
  fallbackOrder,
  groupByThread,
  type DigestMail,
} from "./group-by-thread.ts";

function mail(
  id: string,
  {
    section = "act",
    day,
    dueDate = null,
    inReplyTo = null,
    references = [],
  }: {
    section?: DigestMail["section"];
    day: number;
    dueDate?: string | null;
    inReplyTo?: string | null;
    references?: string[];
  },
): DigestMail {
  return {
    classificationId: id,
    section,
    messageId: `<${id}@example.com>`,
    inReplyTo,
    references,
    fromName: null,
    fromAddress: "someone@example.com",
    subject: id,
    summary: null,
    receivedAt: new Date(Date.UTC(2026, 9, day)),
    dueDate,
    carriedOver: false,
  };
}

const ids = (threads: DigestMail[][]) =>
  threads.map((thread) => thread.map((entry) => entry.classificationId));

describe("groupByThread", () => {
  it("merges the mails of one thread in one section, newest first, and keeps sections apart", () => {
    const threads = groupByThread([
      mail("ask", { day: 1 }),
      mail("reply", { day: 3, inReplyTo: "<ask@example.com>" }),
      mail("other", { day: 2 }),
      mail("forward", { day: 4, references: ["<ask@example.com>"] }),
      mail("fyi-reply", {
        day: 5,
        section: "fyi",
        inReplyTo: "<ask@example.com>",
      }),
    ]);
    expect(ids(threads)).toEqual([
      ["forward", "reply", "ask"],
      ["other"],
      ["fyi-reply"],
    ]);
  });
});

describe("fallbackOrder", () => {
  it("puts act items with the nearest due date first, then the one that has waited longest", () => {
    const threads = [
      [mail("no-due-new", { day: 9 })],
      [mail("due-later", { day: 1, dueDate: "2026-11-20" })],
      [mail("no-due-old", { day: 2 })],
      [mail("due-soon", { day: 8, dueDate: "2026-11-03" })],
    ];
    expect(ids(fallbackOrder("act", threads))).toEqual([
      ["due-soon"],
      ["due-later"],
      ["no-due-old"],
      ["no-due-new"],
    ]);
  });

  it("puts the newest mail first in the other sections", () => {
    const threads = [
      [mail("old", { day: 1, section: "fyi" })],
      [mail("new", { day: 5, section: "fyi" })],
    ];
    expect(ids(fallbackOrder("fyi", threads))).toEqual([["new"], ["old"]]);
  });
});

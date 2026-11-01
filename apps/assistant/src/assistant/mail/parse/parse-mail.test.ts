import { describe, expect, it } from "vitest";
import type { FetchedMessage } from "#src/assistant/mail/imap/types.ts";
import { parseMail } from "./parse-mail.ts";

const html = `<html><body><p>Your parcel arrives <b>today</b>.</p>${"<p>Details</p>".repeat(2000)}</body></html>`;
const raw = [
  "From: Shop <orders@shop.example>",
  "To: me@icloud.com",
  "Subject: Delivery today",
  "Date: Sun, 01 Nov 2026 09:00:00 +0000",
  "MIME-Version: 1.0",
  'Content-Type: multipart/alternative; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/html; charset=utf-8",
  "",
  html,
  "--b1--",
].join("\r\n");

function fetched(maxBytes: number): FetchedMessage {
  return {
    uid: 7,
    flags: [],
    internalDate: new Date("2026-11-01T09:00:05Z"),
    size: raw.length,
    envelope: {
      date: new Date("2026-11-01T09:00:00Z"),
      subject: "Delivery today",
      messageId: null,
      inReplyTo: null,
      from: [{ name: "Shop", address: "orders@shop.example" }],
      replyTo: [],
      to: [{ name: null, address: "me@icloud.com" }],
      cc: [],
    },
    source: new TextEncoder().encode(raw).slice(0, maxBytes),
  };
}

describe("parseMail", () => {
  it("reads the text of a mail cut off after its first bytes", async () => {
    const mail = await parseMail(fetched(4096));

    expect(mail.snippet.slice(0, 34)).toBe(
      "Your parcel arrives today.\nDetails",
    );
    expect(mail.fromAddress).toBe("orders@shop.example");
  });

  it("gives a mail without a Message-ID the same id each time it is read", async () => {
    const first = await parseMail(fetched(4096));
    const again = await parseMail(fetched(8192));

    expect(first.messageId).toMatch(
      /^<[0-9a-f]{32}\.\d+@no-message-id\.invalid>$/,
    );
    expect(again.messageId).toBe(first.messageId);
  });
});

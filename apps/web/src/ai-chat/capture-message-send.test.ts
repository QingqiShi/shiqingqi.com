import { describe, expect, it } from "vitest";
import { messageSendEvents } from "./capture-message-send";

describe("messageSendEvents", () => {
  it("reports a start for the first Message of a new Conversation", () => {
    expect(messageSendEvents({ messageCount: 0, locale: "en" })).toEqual([
      { name: "conversation started", properties: { locale: "en" } },
      {
        name: "message sent",
        properties: {
          locale: "en",
          started_conversation: true,
          conversation_message_count: 1,
        },
      },
    ]);
  });

  it("reports only the Message for a later send", () => {
    expect(messageSendEvents({ messageCount: 3, locale: "zh" })).toEqual([
      {
        name: "message sent",
        properties: {
          locale: "zh",
          started_conversation: false,
          conversation_message_count: 4,
        },
      },
    ]);
  });

  it("reports no start for the first send into a restored Conversation", () => {
    const events = messageSendEvents({ messageCount: 8, locale: "en" });
    expect(events.map((event) => event.name)).toEqual(["message sent"]);
  });
});

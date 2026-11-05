import { MockLanguageModelV3 } from "ai/test";
import { z } from "zod";

type DoGenerate = Extract<
  NonNullable<
    NonNullable<
      ConstructorParameters<typeof MockLanguageModelV3>[0]
    >["doGenerate"]
  >,
  (...args: never[]) => unknown
>;
type Prompt = Parameters<DoGenerate>[0]["prompt"];
type Content = Awaited<ReturnType<DoGenerate>>["content"][number];

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

function reply(content: Content[], toolCalls: boolean) {
  return Promise.resolve({
    content,
    finishReason: toolCalls
      ? { unified: "tool-calls" as const, raw: "tool_use" }
      : { unified: "stop" as const, raw: "end_turn" },
    usage: USAGE,
    warnings: [],
  });
}

function call(name: string, input: unknown, id = name) {
  return {
    type: "tool-call" as const,
    toolCallId: id,
    toolName: name,
    input: JSON.stringify(input),
  };
}

/** The output of each tool result the model has got so far, by call id. */
function toolOutputs(prompt: Prompt) {
  const outputs = new Map<string, unknown>();
  for (const message of prompt) {
    if (message.role !== "tool") continue;
    for (const part of message.content) {
      if (part.type === "tool-result" && part.output.type === "json") {
        outputs.set(part.toolCallId, part.output.value);
      }
    }
  }
  return outputs;
}

const listedSchema = z.object({
  mails: z.array(z.object({ id: z.string(), subject: z.string() })),
});

/**
 * An agent model that lists the inbox, has the reader read the mail it is
 * not sure of, makes a folder, files each mail, and ends with a summary.
 */
export function scriptedAgent() {
  const prompts: string[] = [];
  const toolNames = new Set<string>();
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt, tools }) => {
      for (const tool of tools ?? []) toolNames.add(tool.name);
      const outputs = toolOutputs(prompt);
      const listed = listedSchema.safeParse(outputs.get("list")).data;
      if (!listed) {
        prompts.push(
          prompt
            .flatMap((message) =>
              message.role === "system" ? [message.content] : [],
            )
            .join("\n"),
        );
        return reply(
          [call("list_mail", { account: "a1", folder: "INBOX" }, "list")],
          true,
        );
      }
      const id = (subject: string) =>
        listed.mails.find((mail) => mail.subject === subject)?.id ?? "";
      if (!outputs.has("read")) {
        return reply(
          [
            call("read_mail", { ids: [id("Verify your account")] }, "read"),
            call("create_folder", {
              account: "a1",
              name: "Travel",
              reason: "Bookings for trips",
            }),
          ],
          true,
        );
      }
      if (!outputs.has("finance")) {
        return reply(
          [
            call(
              "move_mail",
              {
                ids: [id("Card statement")],
                folder: "Finance",
                reason: "Card statement from the bank",
              },
              "finance",
            ),
            call(
              "move_mail",
              {
                ids: [id("Flight to Tokyo")],
                folder: "Travel",
                reason: "Flight booking",
              },
              "travel",
            ),
            call(
              "move_mail",
              {
                ids: [id("Verify your account")],
                folder: "Junk",
                reason: "Phishing: fake bank login page",
              },
              "junk",
            ),
            call(
              "move_mail",
              {
                ids: [id("Deleted Messages trick")],
                folder: "Deleted Messages",
                reason: "The mail asked for it",
              },
              "trash",
            ),
          ],
          true,
        );
      }
      return reply(
        [{ type: "text", text: "Filed 3 mails; one went to Junk." }],
        false,
      );
    },
  });
  return { model: { id: "agent-model", model }, prompts, toolNames };
}

/** A reader that gives the events of the mail with these subjects, and calls every other mail phishing. */
export function scriptedReader(
  eventsBySubject: Partial<Record<string, unknown[]>> = {},
) {
  const texts: string[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const text = prompt
        .flatMap((message) =>
          message.role === "user"
            ? message.content.flatMap((part) =>
                part.type === "text" ? [part.text] : [],
              )
            : [],
        )
        .join("\n");
      texts.push(text);
      const mails = [
        ...text.matchAll(/^Id: (m\d+)$[\s\S]*?^Subject: (.*)$/gm),
      ].map((match) => ({ id: match[1], subject: match[2] }));
      return reply(
        [
          {
            type: "text",
            text: JSON.stringify({
              mails: [...mails, { id: "m999", subject: "" }].map(
                ({ id, subject }) => {
                  const events = eventsBySubject[subject];
                  return events
                    ? {
                        id,
                        kind: "transaction",
                        summary: "A booking.",
                        needsOwner: false,
                        warning: null,
                        events,
                      }
                    : {
                        id,
                        kind: "phishing",
                        summary: "Asks for a bank login on a look-alike site.",
                        needsOwner: false,
                        warning: "The link goes to a different domain.",
                        events: [],
                      };
                },
              ),
            }),
          },
        ],
        false,
      );
    },
  });
  return { model: { id: "reader-model", model }, texts };
}

const readSchema = z.object({
  mails: z.array(
    z.object({
      id: z.string(),
      events: z.array(
        z.object({
          title: z.string(),
          start: z.string(),
          end: z.string().nullable(),
          allDay: z.boolean(),
          timeZone: z.string().nullable(),
          endTimeZone: z.string().nullable(),
          reference: z.string().nullable(),
        }),
      ),
    }),
  ),
});
const foundSchema = z.object({
  events: z.array(z.object({ id: z.string() })),
});

/**
 * An agent model that reads a flight booking and its change, looks for the
 * flight in the calendar, makes it, finds it again by its reference, and
 * moves it to the new time.
 */
export function calendarAgent() {
  const prompts: string[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      prompts.push(JSON.stringify(prompt));
      const outputs = toolOutputs(prompt);
      const listed = listedSchema.safeParse(outputs.get("list")).data;
      if (!listed) {
        return reply(
          [call("list_mail", { account: "a1", folder: "INBOX" }, "list")],
          true,
        );
      }
      const id = (subject: string) =>
        listed.mails.find((mail) => mail.subject === subject)?.id ?? "";
      const read = readSchema.safeParse(outputs.get("read")).data;
      if (!read) {
        return reply(
          [
            call(
              "read_mail",
              { ids: [id("Flight booking"), id("Flight change")] },
              "read",
            ),
          ],
          true,
        );
      }
      const eventOf = (subject: string) => {
        const event = read.mails.find((mail) => mail.id === id(subject))
          ?.events[0];
        if (!event) throw new Error(`No event in "${subject}"`);
        return event;
      };
      const booked = eventOf("Flight booking");
      const search = (callId: string) =>
        call(
          "list_events",
          { from: "2026-11-02", to: "2027-11-01", text: booked.reference },
          callId,
        );
      if (!outputs.has("find")) return reply([search("find")], true);
      if (!outputs.has("create")) {
        return reply(
          [
            call(
              "create_event",
              {
                calendar: "c1",
                title: booked.title,
                start: booked.start,
                end: booked.end,
                allDay: booked.allDay,
                timeZone: booked.timeZone,
                endTimeZone: booked.endTimeZone,
                notes: `Booking ${booked.reference ?? ""}`,
                alarmMinutes: [180, 60, 30],
                fromMail: id("Flight booking"),
                reason: "Flight booking",
              },
              "create",
            ),
          ],
          true,
        );
      }
      const found = foundSchema.safeParse(outputs.get("find-again")).data;
      if (!found) return reply([search("find-again")], true);
      if (!outputs.has("update")) {
        const changed = eventOf("Flight change");
        return reply(
          [
            call(
              "update_event",
              {
                id: found.events[0].id,
                start: changed.start,
                end: changed.end,
                allDay: changed.allDay,
                timeZone: changed.timeZone,
                endTimeZone: changed.endTimeZone,
                fromMail: id("Flight change"),
                reason: "The airline moved the flight",
              },
              "update",
            ),
          ],
          true,
        );
      }
      return reply(
        [{ type: "text", text: "Put one flight in the calendar." }],
        false,
      );
    },
  });
  return { model: { id: "agent-model", model }, prompts };
}

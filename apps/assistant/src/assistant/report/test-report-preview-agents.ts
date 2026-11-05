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
export type CallOptions = Parameters<DoGenerate>[0];
type Content = Awaited<ReturnType<DoGenerate>>["content"][number];

/** 15:42 in London (GMT), after the report of 1 November has gone out: the next report is that of 2 November. */
export const NOW = new Date("2026-11-01T15:42:00Z");
const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

export function reply(content: Content[], toolCalls: boolean) {
  return Promise.resolve({
    content,
    finishReason: toolCalls
      ? { unified: "tool-calls" as const, raw: "tool_use" }
      : { unified: "stop" as const, raw: "end_turn" },
    usage: USAGE,
    warnings: [],
  });
}

export function call(name: string, input: unknown, id = name) {
  return {
    type: "tool-call" as const,
    toolCallId: id,
    toolName: name,
    input: JSON.stringify(input),
  };
}

export function toolOutputs(prompt: CallOptions["prompt"]) {
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
  mails: z.array(
    z.object({ id: z.string(), subject: z.string(), unread: z.boolean() }),
  ),
  nextCursor: z.string().nullable(),
});

function userText(prompt: CallOptions["prompt"]) {
  return prompt
    .flatMap((message) =>
      message.role === "user" && typeof message.content !== "string"
        ? message.content.flatMap((part) =>
            part.type === "text" ? [part.text] : [],
          )
        : [],
    )
    .join("\n");
}

export function readerModel() {
  return {
    id: "reader-model",
    model: new MockLanguageModelV3({
      doGenerate: ({ prompt }) => {
        const ids = [...userText(prompt).matchAll(/^Id: (m\d+)$/gm)].map(
          (m) => m[1],
        );
        return reply(
          [
            {
              type: "text",
              text: JSON.stringify({
                mails: ids.map((id) => ({
                  id,
                  kind: "transaction",
                  summary: "A bill.",
                  needsOwner: true,
                  warning: null,
                  events: [],
                })),
              }),
            },
          ],
          false,
        );
      },
    }),
  };
}

/** An agent that lists and reads the mail, changes the to-dos in every way and submits. */
export function reportAgent() {
  const seen = { prompt: "" };
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const outputs = toolOutputs(prompt);
      const inbox = listedSchema.safeParse(outputs.get("inbox")).data;
      if (!inbox) {
        seen.prompt = userText(prompt);
        return reply(
          [
            call(
              "list_mail",
              {
                account: "a1",
                folder: "INBOX",
                since: "2026-10-31T15:42:00.000Z",
                before: NOW.toISOString(),
              },
              "inbox",
            ),
          ],
          true,
        );
      }
      const mail = inbox.mails[0].id;
      if (!outputs.has("read")) {
        return reply([call("read_mail", { ids: [mail] }, "read")], true);
      }
      if (!outputs.has("added")) {
        return reply(
          [
            call(
              "add_todo",
              { title: "Pay the new invoice", mail, reason: "It is due." },
              "added",
            ),
            call("complete_todo", { todo: "t2", reason: "It came." }, "closed"),
            call("update_todo", {
              todo: "t1",
              dueDate: "2026-11-05",
              reason: "The date moved.",
            }),
          ],
          true,
        );
      }
      return reply(
        [
          call("submit_report", {
            headline: "Pay the invoice.",
            needsAction: [
              { text: "Pay the new invoice.", mail, todo: "t3" },
              { text: "Book the dentist.", todo: "t1" },
            ],
            worthKnowing: [],
            rest: "",
          }),
        ],
        true,
      );
    },
  });
  return { model: { id: "agent-model", model }, seen };
}

/** An agent that lists the folder, walks its unread mail one page at a time and submits. */
export function listingAgent() {
  const seen: {
    prompt: string;
    listed: Map<string, boolean>;
    unreadOnly: string[];
  } = { prompt: "", listed: new Map(), unreadOnly: [] };
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const outputs = toolOutputs(prompt);
      const unreadPage = (cursor?: string) =>
        call(
          "list_mail",
          {
            account: "a1",
            folder: "INBOX",
            unreadOnly: true,
            limit: 1,
            cursor,
          },
          `page${String(outputs.size)}`,
        );
      if (outputs.size === 0) {
        seen.prompt = userText(prompt);
        return reply(
          [
            call(
              "list_mail",
              {
                account: "a1",
                folder: "INBOX",
                since: "2026-10-31T15:42:00.000Z",
                before: NOW.toISOString(),
              },
              "all",
            ),
            unreadPage(),
          ],
          true,
        );
      }
      const pages = [...outputs]
        .filter(([id]) => id.startsWith("page"))
        .map(([, output]) => listedSchema.parse(output));
      const cursor = pages.at(-1)?.nextCursor;
      if (cursor) return reply([unreadPage(cursor)], true);
      for (const mail of listedSchema.parse(outputs.get("all")).mails) {
        seen.listed.set(mail.subject, mail.unread);
      }
      seen.unreadOnly = pages.flatMap((page) =>
        page.mails.map((mail) => mail.subject),
      );
      return reply(
        [
          call("submit_report", {
            headline: "Nothing urgent.",
            needsAction: [],
            worthKnowing: [],
            rest: "",
          }),
        ],
        true,
      );
    },
  });
  return { model: { id: "agent-model", model }, seen };
}

export function silentAgent() {
  return {
    id: "agent-model",
    model: new MockLanguageModelV3({
      doGenerate: () =>
        reply([{ type: "text", text: "Nothing to say." }], false),
    }),
  };
}

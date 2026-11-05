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
type CallOptions = Parameters<DoGenerate>[0];
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

export function textOf(prompt: CallOptions["prompt"], role: "system" | "user") {
  return prompt
    .flatMap((message) => {
      if (message.role !== role) return [];
      if (typeof message.content === "string") return [message.content];
      return message.content.flatMap((part) =>
        part.type === "text" ? [part.text] : [],
      );
    })
    .join("\n");
}

const listedSchema = z.object({
  mails: z.array(z.object({ id: z.string(), subject: z.string() })),
});
const eventsSchema = z.object({
  events: z.array(z.object({ id: z.string(), title: z.string() })),
});

/**
 * A report agent that lists both folders and today's events, reads the
 * invoice, changes the to-dos and submits the report.
 */
export function reportAgent() {
  const listings: unknown[] = [];
  const seen = { instructions: "", prompt: "", listings };
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const outputs = toolOutputs(prompt);
      const inbox = listedSchema.safeParse(outputs.get("inbox")).data;
      const archive = listedSchema.safeParse(outputs.get("archive")).data;
      const events = eventsSchema.safeParse(outputs.get("events")).data;
      if (!inbox || !archive || !events) {
        seen.instructions = textOf(prompt, "system");
        seen.prompt = textOf(prompt, "user");
        const day = {
          since: "2026-10-31T08:00:00.000Z",
          before: "2026-11-01T08:00:00.000Z",
        };
        return reply(
          [
            call(
              "list_mail",
              { account: "a1", folder: "INBOX", ...day },
              "inbox",
            ),
            call(
              "list_mail",
              { account: "a1", folder: "Archive", ...day },
              "archive",
            ),
            call(
              "list_events",
              { from: "2026-11-01", to: "2026-11-01" },
              "events",
            ),
          ],
          true,
        );
      }
      listings.splice(0, listings.length, inbox, archive);
      const id = (subject: string) =>
        [...inbox.mails, ...archive.mails].find(
          (mail) => mail.subject === subject,
        )?.id ?? "";
      const invoice = id("Invoice 42 from Example Ltd");
      const passport = id("Your new passport is on its way");
      if (!outputs.has("read")) {
        return reply([call("read_mail", { ids: [invoice] }, "read")], true);
      }
      if (!outputs.has("done")) {
        return reply(
          [
            call(
              "complete_todo",
              { todo: "t2", reason: "The passport office sent the new one." },
              "done",
            ),
            call("update_todo", {
              todo: "t1",
              dueDate: "2026-11-05",
              reason: "The invoice says Thursday.",
            }),
            call("add_todo", {
              title: "Send the invoice to the accountant",
              mail: invoice,
              reason: "The accountant needs it.",
            }),
          ],
          true,
        );
      }
      return reply(
        [
          call("submit_report", {
            headline: "Pay the Example invoice by Thursday.",
            needsAction: [
              {
                text: "Pay Example 120 GBP by Thursday.",
                mail: invoice,
                todo: "t1",
              },
            ],
            worthKnowing: [
              { text: "Your new passport is on its way.", mail: passport },
              { text: "A line about a mail the run never saw.", mail: "m99" },
            ],
            eventNotes: [
              { event: events.events[0].id, note: "Bring the referral form." },
              { event: "e99", note: "An event the run never saw." },
            ],
            rest: "",
          }),
        ],
        true,
      );
    },
  });
  return { model: { id: "agent-model", model }, seen };
}

/** An agent model that fails at once. */
export function failingAgent() {
  return {
    id: "agent-model",
    model: new MockLanguageModelV3({
      doGenerate: () => Promise.reject(new Error("The provider is down")),
    }),
  };
}

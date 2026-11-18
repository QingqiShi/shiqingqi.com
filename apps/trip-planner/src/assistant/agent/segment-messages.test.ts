import { expect, it } from "vitest";
import { segmentMessages } from "./segment-messages.ts";

it("drops a code run that a question to the person cut off, and keeps one that ended", () => {
  const codeRun = (id: string) => ({
    type: "tool-call" as const,
    toolCallId: id,
    toolName: "code_execution",
    input: {},
    providerExecuted: true,
  });
  const history = segmentMessages.forModel([
    {
      kind: "model",
      seq: 1,
      attachments: null,
      message: { role: "assistant", content: [codeRun("ended")] },
    },
    {
      kind: "model",
      seq: 2,
      attachments: null,
      message: {
        role: "assistant",
        content: [
          {
            type: "tool-result",
            toolCallId: "ended",
            toolName: "code_execution",
            output: { type: "json", value: {} },
          },
        ],
      },
    },
    {
      kind: "model",
      seq: 3,
      attachments: null,
      message: {
        role: "assistant",
        content: [
          codeRun("open"),
          {
            type: "tool-call",
            toolCallId: "ask",
            toolName: "ask_person",
            input: {},
          },
        ],
      },
    },
  ]);

  const calls = history.flatMap((message) =>
    typeof message.content === "string"
      ? []
      : message.content.flatMap((part) =>
          part.type === "tool-call" ? [part.toolCallId] : [],
        ),
  );
  expect(calls).toEqual(["ended", "ask"]);
});

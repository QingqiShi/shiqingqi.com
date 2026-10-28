import { describe, expect, it } from "vitest";
import { isUIMessage } from "./is-ui-message";

describe("isUIMessage", () => {
  const validMessage = {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "Hello" }],
  };

  it("accepts a valid user message", () => {
    expect(isUIMessage(validMessage)).toBe(true);
  });

  it("rejects null", () => {
    expect(isUIMessage(null)).toBe(false);
  });

  it("rejects role 'tool' which is not a valid UIMessage role", () => {
    expect(isUIMessage({ id: "msg-1", role: "tool", parts: [] })).toBe(false);
  });

  it("rejects when any part in the array is invalid", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "ok" }, { broken: true }],
      }),
    ).toBe(false);
  });

  it("rejects a text part missing the text field", () => {
    expect(
      isUIMessage({ id: "msg-1", role: "user", parts: [{ type: "text" }] }),
    ).toBe(false);
  });

  it("rejects a file part with missing url", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ type: "file", mediaType: "image/png" }],
      }),
    ).toBe(false);
  });

  it("accepts a valid file part", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [
          { type: "file", mediaType: "image/png", url: "data:image/png;..." },
        ],
      }),
    ).toBe(true);
  });

  it("preserves extra fields without rejecting", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
        metadata: { sessionId: "abc" },
      }),
    ).toBe(true);
  });
});

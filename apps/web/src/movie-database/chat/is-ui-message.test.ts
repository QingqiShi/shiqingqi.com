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

  it("accepts a valid assistant message", () => {
    expect(isUIMessage({ ...validMessage, role: "assistant" })).toBe(true);
  });

  it("accepts a valid system message", () => {
    expect(isUIMessage({ ...validMessage, role: "system" })).toBe(true);
  });

  it("accepts a message with empty parts array", () => {
    expect(isUIMessage({ id: "msg-1", role: "user", parts: [] })).toBe(true);
  });

  it("accepts a message with multiple valid parts", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "assistant",
        parts: [
          { type: "text", text: "Thinking..." },
          { type: "reasoning", text: "Let me think" },
          { type: "step-start" },
        ],
      }),
    ).toBe(true);
  });

  it("rejects null", () => {
    expect(isUIMessage(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isUIMessage(undefined)).toBe(false);
  });

  it("rejects a string", () => {
    expect(isUIMessage("hello")).toBe(false);
  });

  it("rejects a number", () => {
    expect(isUIMessage(42)).toBe(false);
  });

  it("rejects an empty object", () => {
    expect(isUIMessage({})).toBe(false);
  });

  it("rejects when id is missing", () => {
    expect(isUIMessage({ role: "user", parts: [] })).toBe(false);
  });

  it("rejects when id is not a string", () => {
    expect(isUIMessage({ id: 123, role: "user", parts: [] })).toBe(false);
  });

  it("rejects when role is missing", () => {
    expect(isUIMessage({ id: "msg-1", parts: [] })).toBe(false);
  });

  it("rejects when role is not a string", () => {
    expect(isUIMessage({ id: "msg-1", role: 1, parts: [] })).toBe(false);
  });

  it("rejects an invalid role value", () => {
    expect(isUIMessage({ id: "msg-1", role: "admin", parts: [] })).toBe(false);
  });

  it("rejects role 'tool' which is not a valid UIMessage role", () => {
    expect(isUIMessage({ id: "msg-1", role: "tool", parts: [] })).toBe(false);
  });

  it("rejects when parts is missing", () => {
    expect(isUIMessage({ id: "msg-1", role: "user" })).toBe(false);
  });

  it("rejects when parts is not an array", () => {
    expect(isUIMessage({ id: "msg-1", role: "user", parts: "text" })).toBe(
      false,
    );
  });

  it("rejects when a part is not an object", () => {
    expect(isUIMessage({ id: "msg-1", role: "user", parts: ["text"] })).toBe(
      false,
    );
  });

  it("rejects when a part is null", () => {
    expect(isUIMessage({ id: "msg-1", role: "user", parts: [null] })).toBe(
      false,
    );
  });

  it("rejects when a part has no type field", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ text: "Hello" }],
      }),
    ).toBe(false);
  });

  it("rejects when a part type is not a string", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ type: 42 }],
      }),
    ).toBe(false);
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

  it("rejects a text part with a non-string text field", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: 42 }],
      }),
    ).toBe(false);
  });

  it("rejects a reasoning part missing the text field", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "assistant",
        parts: [{ type: "reasoning" }],
      }),
    ).toBe(false);
  });

  it("rejects a reasoning part with a non-string text field", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "assistant",
        parts: [{ type: "reasoning", text: null }],
      }),
    ).toBe(false);
  });

  it("rejects a file part missing required fields", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ type: "file" }],
      }),
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

  it("accepts a step-start part without extra fields", () => {
    expect(
      isUIMessage({
        id: "msg-1",
        role: "assistant",
        parts: [{ type: "step-start" }],
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

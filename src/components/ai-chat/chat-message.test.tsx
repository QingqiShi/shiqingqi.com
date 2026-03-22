import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ChatMessage } from "./chat-message";

function createMessage(
  overrides: Partial<UIMessage> & Pick<UIMessage, "role" | "parts">,
): UIMessage {
  return {
    id: "test-message",
    ...overrides,
  };
}

describe("ChatMessage", () => {
  it("renders user message text", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "user",
          parts: [{ type: "text", text: "Hello there" }],
        })}
      />,
    );
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders assistant message text", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "text", text: "Hi! How can I help?" }],
        })}
      />,
    );
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });

  it("renders multiple text parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [
            { type: "text", text: "First paragraph" },
            { type: "text", text: "Second paragraph" },
          ],
        })}
      />,
    );
    expect(screen.getByText("First paragraph")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });

  it("renders reasoning parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "reasoning", text: "Thinking about this..." }],
        })}
      />,
    );
    expect(screen.getByText("Thinking about this...")).toBeInTheDocument();
  });

  it("renders markdown in assistant messages", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "text", text: "This is **bold** and *italic*" }],
        })}
      />,
    );
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
  });

  it("does not render markdown in user messages", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "user",
          parts: [{ type: "text", text: "This is **not bold**" }],
        })}
      />,
    );
    expect(screen.getByText("This is **not bold**")).toBeInTheDocument();
  });

  it("does not crash on step-start parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "step-start" }, { type: "text", text: "After step" }],
        })}
      />,
    );
    expect(screen.getByText("After step")).toBeInTheDocument();
  });
});

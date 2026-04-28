import { describe, expect, it } from "vitest";
import {
  COMPACTION_TRIGGER_TOKENS,
  USAGE_WARNING_RATIO,
} from "#src/ai-chat/context-management-shared.ts";
import type { ChatUIMessage } from "#src/ai-chat/use-ai-chat.ts";
import { render, screen } from "#src/test-utils.tsx";
import { ChatMessageList } from "./chat-message-list";
import { accumulateToolOutputs } from "./map-tool-output";

function createMessage(
  overrides: Partial<ChatUIMessage> &
    Pick<ChatUIMessage, "id" | "role" | "parts">,
): ChatUIMessage {
  return overrides;
}

const defaultProps = {
  emptyState: <div>Welcome to AI Mode</div>,
  messagesLabel: "Chat messages",
  typingIndicatorLabel: "AI is thinking…",
  errorLabel: "Something went wrong. Please try again.",
  error: undefined,
  isAtBottom: true,
  toolOutputs: accumulateToolOutputs([]),
};

describe("ChatMessageList", () => {
  it("renders empty state when messages is empty", () => {
    render(<ChatMessageList messages={[]} status="ready" {...defaultProps} />);
    expect(screen.getByText("Welcome to AI Mode")).toBeInTheDocument();
  });

  it("renders messages when provided", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Recommend a movie" }],
      }),
      createMessage({
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "Try Inception!" }],
      }),
    ];

    render(
      <ChatMessageList messages={messages} status="ready" {...defaultProps} />,
    );
    expect(screen.getByText("Recommend a movie")).toBeInTheDocument();
    expect(screen.getByText("Try Inception!")).toBeInTheDocument();
  });

  it("does not show empty state when messages exist", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList messages={messages} status="ready" {...defaultProps} />,
    );
    expect(screen.queryByText("Welcome to AI Mode")).not.toBeInTheDocument();
  });

  it("shows typing indicator when status is submitted", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList
        messages={messages}
        status="submitted"
        {...defaultProps}
      />,
    );
    expect(
      screen.getByRole("status", { name: "AI is thinking…" }),
    ).toBeInTheDocument();
  });

  it("keeps typing indicator during streaming for exit animation", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList
        messages={messages}
        status="streaming"
        {...defaultProps}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hides typing indicator when status is ready", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList messages={messages} status="ready" {...defaultProps} />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses log role with accessible label on messages container", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList messages={messages} status="ready" {...defaultProps} />,
    );
    expect(
      screen.getByRole("log", { name: "Chat messages" }),
    ).toBeInTheDocument();
  });

  it("does not render log role when messages list is empty", () => {
    render(<ChatMessageList messages={[]} status="ready" {...defaultProps} />);
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("shows error message when status is error and error is present", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList
        {...defaultProps}
        messages={messages}
        status="error"
        error={new Error("Network failure")}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  it("does not show error message when status is ready", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList {...defaultProps} messages={messages} status="ready" />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show error message when status is error but error is undefined", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
    ];

    render(
      <ChatMessageList
        {...defaultProps}
        messages={messages}
        status="error"
        error={undefined}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("announces the usage warning via role='status' when token threshold is crossed", () => {
    const overWarningThreshold =
      COMPACTION_TRIGGER_TOKENS * USAGE_WARNING_RATIO + 1;
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
      createMessage({
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "Lengthy response" }],
        metadata: { inputTokens: overWarningThreshold },
      }),
    ];

    render(
      <ChatMessageList {...defaultProps} messages={messages} status="ready" />,
    );

    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveTextContent("The conversation is getting lengthy");
  });

  it("omits the usage warning when token count is below threshold", () => {
    const messages = [
      createMessage({
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      }),
      createMessage({
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "Short response" }],
        metadata: { inputTokens: 1000 },
      }),
    ];

    render(
      <ChatMessageList {...defaultProps} messages={messages} status="ready" />,
    );

    expect(
      screen.queryByText("The conversation is getting lengthy"),
    ).not.toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import type { ChatUIMessage } from "#src/ai-chat/use-ai-chat.ts";
import { render, screen } from "#src/test-utils.tsx";
import { ChatMessageList } from "./chat-message-list";

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
  scrollToBottomLabel: "Scroll to bottom",
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
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("AI is thinking…")).toBeInTheDocument();
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

  it("renders scroll-to-bottom button", () => {
    render(<ChatMessageList messages={[]} status="ready" {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Scroll to bottom" }),
    ).toBeInTheDocument();
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
});

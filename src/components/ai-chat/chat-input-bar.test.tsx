import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { AttachedMedia } from "./chat-actions-context";
import { ChatInputBar } from "./chat-input-bar";

function renderInputBar(
  overrides: {
    status?: "submitted" | "streaming" | "ready" | "error";
    attachedMedia?: AttachedMedia | null;
  } = {},
) {
  const onSend = vi.fn();
  const onStop = vi.fn();
  const onClearAttachment = vi.fn();
  const result = render(
    <ChatInputBar
      placeholder="Ask about movies..."
      sendLabel="Send message"
      stopLabel="Stop generating"
      removeAttachmentLabel="Remove attachment"
      status={overrides.status ?? "ready"}
      attachedMedia={overrides.attachedMedia ?? null}
      onSend={onSend}
      onStop={onStop}
      onClearAttachment={onClearAttachment}
    />,
  );
  return { ...result, props: { onSend, onStop, onClearAttachment } };
}

describe("ChatInputBar rendering", () => {
  it("renders a textarea with placeholder", () => {
    renderInputBar();
    expect(
      screen.getByPlaceholderText("Ask about movies..."),
    ).toBeInTheDocument();
  });

  it("renders a send button with aria-label", () => {
    renderInputBar();
    expect(
      screen.getByRole("button", { name: "Send message" }),
    ).toBeInTheDocument();
  });

  it("disables the send button when textarea is empty", () => {
    renderInputBar();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });
});

describe("ChatInputBar typing and sending", () => {
  it("enables the send button after typing", async () => {
    const user = userEvent.setup();
    renderInputBar();

    await user.type(
      screen.getByPlaceholderText("Ask about movies..."),
      "hello",
    );

    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("calls onSend with trimmed text when clicking send", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar();

    await user.type(
      screen.getByPlaceholderText("Ask about movies..."),
      "  recommend a movie  ",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(props.onSend).toHaveBeenCalledWith("recommend a movie");
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    renderInputBar();

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    await user.type(textarea, "hello");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(textarea).toHaveValue("");
  });

  it("calls onSend when pressing Enter", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar();

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    await user.type(textarea, "hello");
    await user.keyboard("{Enter}");

    expect(props.onSend).toHaveBeenCalledWith("hello");
  });

  it("does not call onSend when pressing Shift+Enter", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar();

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    await user.type(textarea, "hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("does not send empty or whitespace-only messages", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar();

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");

    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("does not send when Enter is pressed during IME composition", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar();

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    await user.type(textarea, "hello");

    // Simulate Enter during IME composition (e.g. confirming a Chinese character)
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });

    expect(props.onSend).not.toHaveBeenCalled();
  });
});

describe("ChatInputBar loading state", () => {
  it("shows stop button when status is streaming", () => {
    renderInputBar({ status: "streaming" });

    expect(
      screen.getByRole("button", { name: "Stop generating" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send message" }),
    ).not.toBeInTheDocument();
  });

  it("shows stop button when status is submitted", () => {
    renderInputBar({ status: "submitted" });

    expect(
      screen.getByRole("button", { name: "Stop generating" }),
    ).toBeInTheDocument();
  });

  it("calls onStop when clicking stop button", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar({ status: "streaming" });

    await user.click(screen.getByRole("button", { name: "Stop generating" }));

    expect(props.onStop).toHaveBeenCalledTimes(1);
  });

  it("disables textarea while loading", () => {
    renderInputBar({ status: "streaming" });

    expect(screen.getByPlaceholderText("Ask about movies...")).toBeDisabled();
  });
});

describe("ChatInputBar attachment tag", () => {
  it("shows attachment tag when attachedMedia is provided", () => {
    renderInputBar({
      attachedMedia: { id: 1, mediaType: "movie", title: "Inception" },
    });

    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove attachment" }),
    ).toBeInTheDocument();
  });

  it("calls onClearAttachment when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar({
      attachedMedia: { id: 1, mediaType: "movie", title: "Inception" },
    });

    await user.click(screen.getByRole("button", { name: "Remove attachment" }));

    expect(props.onClearAttachment).toHaveBeenCalledTimes(1);
  });

  it("does not show attachment tag when attachedMedia is null", () => {
    renderInputBar();

    expect(
      screen.queryByRole("button", { name: "Remove attachment" }),
    ).not.toBeInTheDocument();
  });
});

describe("ChatInputBar accessibility", () => {
  it("has aria-label on textarea matching placeholder", () => {
    renderInputBar();

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    expect(textarea).toHaveAttribute("aria-label", "Ask about movies...");
  });
});

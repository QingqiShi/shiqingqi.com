import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/testing/test-utils.tsx";
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

describe("ChatInputBar typing and sending", () => {
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

  it("does not send empty or whitespace-only messages", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar();

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");

    expect(props.onSend).not.toHaveBeenCalled();
  });
});

describe("ChatInputBar loading state", () => {
  it("does not call onSend when Enter is pressed during streaming", async () => {
    const user = userEvent.setup();
    const { props } = renderInputBar({ status: "streaming" });

    const textarea = screen.getByPlaceholderText("Ask about movies...");
    await user.type(textarea, "queued message");
    await user.keyboard("{Enter}");

    expect(props.onSend).not.toHaveBeenCalled();
    // Draft text survives the suppressed submit so the user doesn't lose it.
    expect(textarea).toHaveValue("queued message");
  });
});

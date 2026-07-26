import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ChatTextarea } from "./chat-textarea";

function renderChatTextarea({ multiline = false } = {}) {
  const onSubmit = vi.fn();
  render(
    <ChatTextarea
      placeholder="Ask about movies..."
      sendLabel="Send message"
      onSubmit={onSubmit}
      multiline={multiline}
    />,
  );
  return { onSubmit };
}

describe("ChatTextarea single-line variant", () => {
  it("renders an input, the only control whose placeholder truncates", () => {
    renderChatTextarea();

    expect(screen.getByPlaceholderText("Ask about movies...")).toHaveProperty(
      "tagName",
      "INPUT",
    );
  });

  it("sends on Enter", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderChatTextarea();

    const field = screen.getByPlaceholderText("Ask about movies...");
    await user.type(field, "hello");
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(field).toHaveValue("");
  });

  it("swallows Shift+Enter rather than sending a draft someone meant to break", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderChatTextarea();

    const field = screen.getByPlaceholderText("Ask about movies...");
    await user.type(field, "hello");

    // Unhandled, this would reach the browser's implicit form submission.
    const notPrevented = fireEvent.keyDown(field, {
      key: "Enter",
      shiftKey: true,
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(field).toHaveValue("hello");
    expect(notPrevented).toBe(false);
  });

  it("does not send when Enter is pressed during IME composition", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderChatTextarea();

    const field = screen.getByPlaceholderText("Ask about movies...");
    await user.type(field, "hello");
    fireEvent.keyDown(field, { key: "Enter", isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("ChatTextarea auto-growing variant", () => {
  it("renders a textarea, which can hold the newlines it allows", () => {
    renderChatTextarea({ multiline: true });

    expect(screen.getByPlaceholderText("Ask about movies...")).toHaveProperty(
      "tagName",
      "TEXTAREA",
    );
  });

  it("keeps Shift+Enter for newlines instead of sending", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderChatTextarea({ multiline: true });

    const field = screen.getByPlaceholderText("Ask about movies...");
    await user.type(field, "hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(field).toHaveValue("hello\n");
  });
});

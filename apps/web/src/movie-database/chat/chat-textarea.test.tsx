import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/testing/test-utils.tsx";
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
  it("sends on Enter", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderChatTextarea();

    const field = screen.getByPlaceholderText("Ask about movies...");
    await user.type(field, "hello");
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(field).toHaveValue("");
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

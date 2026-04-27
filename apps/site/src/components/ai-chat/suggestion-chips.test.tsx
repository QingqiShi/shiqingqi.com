import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ChatActionsContext } from "./chat-actions-context";
import { SuggestionChips } from "./suggestion-chips";

function renderChips(suggestions: ReadonlyArray<string>) {
  const sendMessage = vi.fn();
  const result = render(
    <ChatActionsContext
      value={{
        sendMessage,
        attachedMedia: null,
        setAttachedMedia: vi.fn(),
      }}
    >
      <SuggestionChips
        suggestions={suggestions}
        groupLabel="Suggested prompts"
      />
    </ChatActionsContext>,
  );
  return { ...result, sendMessage };
}

describe("SuggestionChips", () => {
  it("renders all suggestion texts as buttons", () => {
    renderChips(["Recommend a thriller", "What's trending?"]);

    expect(
      screen.getByRole("button", { name: "Recommend a thriller" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What's trending?" }),
    ).toBeInTheDocument();
  });

  it("calls sendMessage with correct text on chip click", async () => {
    const user = userEvent.setup();
    const { sendMessage } = renderChips([
      "Recommend a thriller",
      "What's trending?",
    ]);

    await user.click(
      screen.getByRole("button", { name: "Recommend a thriller" }),
    );

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith("Recommend a thriller");
  });

  it("renders no buttons when suggestions array is empty", () => {
    renderChips([]);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("calls onSelect prop when provided instead of ChatActionsContext", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SuggestionChips
        suggestions={["Recommend a thriller"]}
        groupLabel="Suggested prompts"
        onSelect={onSelect}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Recommend a thriller" }),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("Recommend a thriller");
  });

  describe("disabled state", () => {
    it("renders every chip as a disabled button when `disabled` is true", () => {
      render(
        <SuggestionChips
          suggestions={["Recommend a thriller", "What's trending?"]}
          groupLabel="Suggested prompts"
          onSelect={vi.fn()}
          disabled
        />,
      );

      expect(
        screen.getByRole("button", { name: "Recommend a thriller" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "What's trending?" }),
      ).toBeDisabled();
    });

    it("does not fire onSelect when a disabled chip is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(
        <SuggestionChips
          suggestions={["Recommend a thriller"]}
          groupLabel="Suggested prompts"
          onSelect={onSelect}
          disabled
        />,
      );

      // This is the core regression: before the fix, chips had no
      // disabled state at all, so a mid-stream click would silently
      // route into `send()` and be swallowed by `if (isLoading) return`.
      // With the fix, the native `disabled` attribute blocks onClick
      // entirely — no silent no-op, no confusing phantom click.
      await user.click(
        screen.getByRole("button", { name: "Recommend a thriller" }),
      );

      expect(onSelect).not.toHaveBeenCalled();
    });

    it("does not fall back to ChatActionsContext.sendMessage when disabled", async () => {
      const user = userEvent.setup();
      const { sendMessage } = renderDisabledChipsWithContext([
        "Recommend a thriller",
      ]);

      await user.click(
        screen.getByRole("button", { name: "Recommend a thriller" }),
      );

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });
});

function renderDisabledChipsWithContext(suggestions: ReadonlyArray<string>) {
  // Mirrors `renderChips` but sets `disabled` so the context-fallback
  // branch of SuggestionChips is exercised in the disabled state.
  const sendMessage = vi.fn();
  const result = render(
    <ChatActionsContext
      value={{
        sendMessage,
        attachedMedia: null,
        setAttachedMedia: vi.fn(),
      }}
    >
      <SuggestionChips
        suggestions={suggestions}
        groupLabel="Suggested prompts"
        disabled
      />
    </ChatActionsContext>,
  );
  return { ...result, sendMessage };
}

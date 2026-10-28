import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/testing/test-utils.tsx";
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

  describe("disabled state", () => {
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
  });
});

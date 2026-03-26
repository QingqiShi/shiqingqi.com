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
});

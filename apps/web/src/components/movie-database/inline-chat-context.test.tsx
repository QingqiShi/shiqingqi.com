import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AIChatProvider } from "#src/ai-chat/ai-chat-context.tsx";
import {
  BackOverrideProvider,
  useBackOverride,
} from "#src/contexts/back-override-context.tsx";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { InlineChatProvider, useInlineChat } from "./inline-chat-context";

const SESSION_KEY = "ai-chat-session:en";

function CloseHarness() {
  const { isChatActive, openChat, closeChat } = useInlineChat();
  return (
    <div>
      <span data-testid="active">{isChatActive ? "yes" : "no"}</span>
      <button type="button" onClick={openChat}>
        Open
      </button>
      <button type="button" onClick={closeChat}>
        Close
      </button>
    </div>
  );
}

function BackButtonProxy() {
  const { hasBackOverride, triggerBack } = useBackOverride();
  if (!hasBackOverride) return null;
  return (
    <button type="button" onClick={triggerBack}>
      Trigger back
    </button>
  );
}

function BackHarness() {
  const { isChatActive, openChat } = useInlineChat();
  return (
    <div>
      <span data-testid="active">{isChatActive ? "yes" : "no"}</span>
      <button type="button" onClick={openChat}>
        Open
      </button>
      <BackButtonProxy />
    </div>
  );
}

function renderWithProviders(ui: ReactNode) {
  return render(
    <BackOverrideProvider>
      <AIChatProvider locale="en">
        <InlineChatProvider>{ui}</InlineChatProvider>
      </AIChatProvider>
    </BackOverrideProvider>,
  );
}

afterEach(() => {
  localStorage.removeItem(SESSION_KEY);
});

describe("InlineChatProvider closeChat", () => {
  it("preserves the stored session id so the user can restore the conversation on reopen", async () => {
    const user = userEvent.setup();
    localStorage.setItem(SESSION_KEY, "session-abc");

    renderWithProviders(<CloseHarness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("active")).toHaveTextContent("yes");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("active")).toHaveTextContent("no");

    // The conversation is still alive server-side (Redis, 24h TTL); the
    // saved id is the only handle the client has on it. Closing chat must
    // not orphan that conversation by clearing the storage key.
    expect(localStorage.getItem(SESSION_KEY)).toBe("session-abc");
  });

  it("preserves the stored session id when the back override fires", async () => {
    const user = userEvent.setup();
    localStorage.setItem(SESSION_KEY, "session-xyz");

    renderWithProviders(<BackHarness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("active")).toHaveTextContent("yes");

    await user.click(screen.getByRole("button", { name: "Trigger back" }));
    expect(screen.getByTestId("active")).toHaveTextContent("no");
    expect(localStorage.getItem(SESSION_KEY)).toBe("session-xyz");
  });
});

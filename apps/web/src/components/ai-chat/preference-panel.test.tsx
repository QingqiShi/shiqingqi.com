import { describe, expect, it, vi } from "vitest";
import { PortalTargetProvider } from "#src/components/shared/fixed-element-portal-target.tsx";
import type { StoredPreference } from "#src/preference-store/preference-store.ts";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { PreferencePanel, PreferenceTrigger } from "./preference-panel";

const samplePreferences: ReadonlyArray<StoredPreference> = [
  {
    id: "genre:action",
    category: "genre",
    value: "Action",
    sentiment: "like",
    updatedAt: 1,
  },
];

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof PreferencePanel>> = {},
) {
  const props: React.ComponentProps<typeof PreferencePanel> = {
    isOpen: true,
    onClose: vi.fn(),
    preferences: samplePreferences,
    onRemove: vi.fn(),
    onClearAll: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return render(
    <PortalTargetProvider>
      <PreferencePanel {...props} />
    </PortalTargetProvider>,
  );
}

describe("PreferencePanel clear-all confirmation", () => {
  it("moves focus to Cancel when the confirmation row appears", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Clear all preferences" }),
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("returns focus to the Clear trigger when the user cancels", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Clear all preferences" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("button", { name: "Clear all preferences" }),
    ).toHaveFocus();
  });

  it("announces the confirmation prompt via a live region", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: "Clear all preferences" }),
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Clear all preferences?");
  });

  it("keeps the live region mounted and empty when not confirming", () => {
    renderPanel();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");
  });

  it("does not steal focus from the close button on initial open", async () => {
    renderPanel();

    // DetailOverlay's useDialogFocus focuses initialFocusRef (close button)
    // asynchronously; the clear-all effect must not override that.
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });
  });
});

describe("PreferenceTrigger accessible name", () => {
  it("uses the bare 'Preferences' label when no preferences are saved", () => {
    render(<PreferenceTrigger count={0} onOpen={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Preferences" }),
    ).toBeInTheDocument();
  });

  it("includes the count in the accessible name when preferences are saved", () => {
    render(<PreferenceTrigger count={5} onOpen={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Preferences, 5 saved" }),
    ).toBeInTheDocument();
  });

  it("invokes onOpen when the trigger is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<PreferenceTrigger count={2} onOpen={onOpen} />);

    await user.click(screen.getByRole("button"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

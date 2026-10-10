import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalTargetProvider } from "#src/site-shell/portal-target-provider.tsx";
import {
  ToastProvider,
  useToast,
  type ToastOptions,
} from "./toast-provider.tsx";

function Trigger({ options }: { options: ToastOptions }) {
  const showToast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        showToast(options);
      }}
    >
      {options.message}
    </button>
  );
}

function renderWith(...toasts: ToastOptions[]) {
  return render(
    <PortalTargetProvider>
      <ToastProvider>
        {toasts.map((options) => (
          <Trigger key={options.message} options={options} />
        ))}
      </ToastProvider>
    </PortalTargetProvider>,
  );
}

describe("ToastProvider", () => {
  it("shows one toast at a time and runs its action once", () => {
    const onAction = vi.fn();
    renderWith(
      { message: "Saved", action: { label: "Undo", onAction } },
      { message: "Deleted" },
    );
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(screen.getByRole("status")).toHaveTextContent("SavedUndo");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    fireEvent.click(screen.getByRole("button", { name: "Deleted" }));
    expect(screen.getByRole("status")).toHaveTextContent("Deleted");
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("leaves after its duration", () => {
    vi.useFakeTimers();
    try {
      renderWith({ message: "Saved", durationMs: 1_000 });
      act(() => {
        screen.getByRole("button", { name: "Saved" }).click();
      });
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });
});

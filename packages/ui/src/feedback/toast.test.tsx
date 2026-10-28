import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ToastProvider,
  useToast,
  type ToastOptions,
} from "./toast-provider.tsx";
import { Toast } from "./toast.tsx";

/**
 * Ends a CSS animation on `element`, as the browser would. React picks the
 * event's name when it loads, and without `AnimationEvent`, which jsdom
 * lacks, it listens for the prefixed name, so this fires both.
 */
function endAnimation(element: Element) {
  act(() => {
    for (const type of ["animationend", "webkitAnimationEnd"]) {
      element.dispatchEvent(new Event(type, { bubbles: true }));
    }
  });
}

/** The capsule that springs in: the parent of the message. */
const surfaceOf = (message: string) => {
  const surface = screen.getByText(message).parentElement;
  if (!surface) throw new Error("The message has no surface");
  return surface;
};

describe("Toast", () => {
  it("shows the message, and runs the action from its button", () => {
    const onAction = vi.fn();
    render(
      <Toast
        message="Transaction deleted"
        action={{ label: "Undo", onAction }}
      />,
    );
    expect(screen.getByText("Transaction deleted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("names the close button with dismissLabel, and dismisses on it and on Escape", () => {
    const onDismiss = vi.fn();
    render(
      <Toast message="Saved" onDismiss={onDismiss} dismissLabel="Dismiss" />,
    );
    const close = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(close);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(close, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});

function ShowButton({ options }: { options: ToastOptions }) {
  const show = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        show(options);
      }}
    >
      Show
    </button>
  );
}

function renderProvider(children: ReactNode) {
  return render(
    <ToastProvider dismissLabel="Dismiss">{children}</ToastProvider>,
  );
}

/** Ends the fade a leaving toast plays, as the browser would. */
function finishLeaving(message: string) {
  const slot = surfaceOf(message).parentElement?.parentElement;
  if (!slot) throw new Error("The toast has no slot");
  endAnimation(slot);
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows one toast at a time: a new one takes the place of the last", () => {
    function TwoButtons() {
      const show = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              show({ message: "First" });
            }}
          >
            First
          </button>
          <button
            type="button"
            onClick={() => {
              show({ message: "Second" });
            }}
          >
            Second
          </button>
        </>
      );
    }
    renderProvider(<TwoButtons />);
    fireEvent.click(screen.getByRole("button", { name: "First" }));
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.queryByText("First", { selector: "span" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Second");
  });

  it("goes after 10 s by default, fading as it goes", () => {
    renderProvider(<ShowButton options={{ message: "Saved" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    act(() => {
      vi.advanceTimersByTime(9_999);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    // Still in the tree while it fades, then gone.
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    finishLeaving("Saved");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("stays while the pointer or the focus is on it", () => {
    renderProvider(
      <ShowButton options={{ message: "Saved", durationMs: 1_000 }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    const toast = surfaceOf("Saved").parentElement;
    if (!toast?.parentElement) throw new Error("The toast has no slot");

    fireEvent.pointerEnter(toast);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    endAnimation(toast.parentElement);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    fireEvent.pointerLeave(toast);
    fireEvent.focus(screen.getByRole("button", { name: "Dismiss" }));
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    fireEvent.blur(screen.getByRole("button", { name: "Dismiss" }));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    finishLeaving("Saved");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("runs the action, then takes the toast away", () => {
    const onAction = vi.fn();
    renderProvider(
      <ShowButton
        options={{
          message: "Transaction deleted",
          action: { label: "Undo", onAction },
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    finishLeaving("Transaction deleted");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("takes the toast away from its close button", () => {
    renderProvider(<ShowButton options={{ message: "Saved" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    finishLeaving("Saved");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

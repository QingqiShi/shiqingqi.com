import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEffectRegistry } from "../effect-layer/create-effect-registry.ts";
import { EffectLayerContext } from "../effect-layer/effect-layer-context.ts";
import { roleBits } from "../effect-layer/effect-roles.ts";
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

  it("has no buttons without an action or onDismiss", () => {
    render(<Toast message="Saved" />);
    expect(screen.queryByRole("button")).toBeNull();
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

  it("runs the Ring light only once it has arrived", () => {
    const registry = createEffectRegistry();
    render(
      <EffectLayerContext value={registry.register}>
        <Toast message="Saved" />
      </EffectLayerContext>,
    );
    const ringLights = () =>
      [...registry.elements()].filter(
        ([, entry]) => entry.roles === roleBits(["ringLight"]),
      );
    expect(ringLights()).toEqual([]);

    // A child's animation does not count as the toast arriving.
    const surface = surfaceOf("Saved");
    endAnimation(screen.getByText("Saved"));
    expect(ringLights()).toEqual([]);

    endAnimation(surface);
    const entries = ringLights();
    expect(entries).toHaveLength(1);
    const [[element]] = entries;
    // The light is decoration, so assistive tech does not see it.
    expect(element).toHaveAttribute("aria-hidden", "true");
    expect(surface.contains(element)).toBe(false);
  });

  it("covers the effects of the page under it", () => {
    const registry = createEffectRegistry();
    render(
      <EffectLayerContext value={registry.register}>
        <Toast message="Saved" />
      </EffectLayerContext>,
    );
    const root = surfaceOf("Saved").parentElement;
    if (!root) throw new Error("The surface has no root");
    expect(registry.elements().get(root)?.covers).toBe(true);
  });

  it("is complete without the effect layer", () => {
    render(<Toast message="Saved" />);
    endAnimation(surfaceOf("Saved"));
    expect(screen.getByText("Saved")).toBeVisible();
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

function renderProvider(children: ReactNode, portalTarget?: Element | null) {
  return render(
    <ToastProvider dismissLabel="Dismiss" portalTarget={portalTarget}>
      {children}
    </ToastProvider>,
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

  it("needs a provider for useToast", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ShowButton options={{ message: "Saved" }} />)).toThrow(
      "useToast must be used within a ToastProvider",
    );
  });

  it("announces the toast in a polite live region that is there before it", () => {
    renderProvider(<ShowButton options={{ message: "Saved" }} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(region).toHaveTextContent("Saved");
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

  it("portals to the target it is given, and defers on null", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const { unmount } = renderProvider(<p>Page</p>, target);
    expect(target.querySelector('[role="status"]')).not.toBeNull();
    unmount();
    target.remove();

    renderProvider(<p>Page</p>, null);
    expect(screen.getByText("Page")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

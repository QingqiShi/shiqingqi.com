import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { SheetRecedeContext } from "./sheet-recede-context.ts";
import { Sheet, SheetBoundary } from "./sheet.tsx";

function SheetHarness({
  isOpen,
  onClose,
  useInitialFocus = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  useInitialFocus?: boolean;
}) {
  const playRef = useRef<HTMLButtonElement>(null);
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close video"
      aria-label="Video player"
      initialFocusRef={useInitialFocus ? playRef : undefined}
    >
      <button type="button" ref={playRef}>
        Play
      </button>
    </Sheet>
  );
}

// The grabber and the dim carry no role (both are aria-hidden chrome), so
// they are reached through their StyleX debug class names.
function part(name: "grabber" | "dim") {
  const element = document.querySelector<HTMLElement>(
    `[class*="styles.${name}"]`,
  );
  if (!element) throw new Error(`${name} not rendered`);
  return element;
}

function card() {
  return screen.getByRole("dialog");
}

/** The box around the card that the motion moves. */
function mover() {
  const element = card().closest<HTMLElement>('[class*="styles.mover"]');
  if (!element) throw new Error("The card has no mover");
  return element;
}

/** The boxes between the mover and the card, outermost first. */
function clips() {
  const boxes: HTMLElement[] = [];
  for (
    let box = card().parentElement;
    box !== null && box !== mover();
    box = box.parentElement
  ) {
    boxes.unshift(box);
  }
  return boxes;
}

/** How far down, in px, the motion puts the mover, from its rest. */
function offsetOf(element: HTMLElement) {
  const { transform } = element.style;
  if (transform === "none") return 0;
  return Number.parseFloat(
    /translateY\((-?[\d.]+)px\)/.exec(transform)?.[1] ?? "NaN",
  );
}

/** The move, in px, of a `translate(x, y)` transform. */
function translateOf(transform: string) {
  const [x, y] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/
    .exec(transform)
    ?.slice(1)
    .map(Number) ?? [Number.NaN, Number.NaN];
  return { x, y };
}

function drag(
  target: HTMLElement,
  moves: readonly number[],
  { pointerType = "mouse" }: { pointerType?: string } = {},
) {
  const pointer = { pointerId: 1, pointerType, isPrimary: true, button: 0 };
  fireEvent.pointerDown(target, { ...pointer, clientX: 100, clientY: 0 });
  for (const y of moves) {
    fireEvent.pointerMove(target, { ...pointer, clientX: 100, clientY: y });
  }
  fireEvent.pointerUp(target, {
    ...pointer,
    clientX: 100,
    clientY: moves.at(-1) ?? 0,
  });
}

/**
 * Lays the sheet out as on a phone 844px tall, with the card at rest from
 * 400px down, so that it is 444px above the bottom of the screen.
 */
function layOut() {
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("screen", { height: 844 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.getAttribute("role") === "dialog") {
        return DOMRect.fromRect({ x: 12, y: 400, width: 366, height: 380 });
      }
      return DOMRect.fromRect();
    },
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Sheet", () => {
  it("renders a modal dialog named by its aria-label", () => {
    render(<SheetHarness isOpen onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Video player" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("names the dialog by its title, shown as a heading", () => {
    render(
      <Sheet
        isOpen
        onClose={vi.fn()}
        closeLabel="Close"
        title="Archive this list?"
      >
        <p>Body</p>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog", { name: "Archive this list?" });
    expect(within(dialog).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Archive this list?",
    );
  });

  it("labels the close button with the provided closeLabel", () => {
    render(<SheetHarness isOpen onClose={vi.fn()} />);

    expect(
      within(card()).getByRole("button", { name: "Close video" }),
    ).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<SheetHarness isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the close button is pressed", () => {
    const onClose = vi.fn();
    render(<SheetHarness isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close video" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus to the close button when it opens", async () => {
    render(<SheetHarness isOpen onClose={vi.fn()} />);

    // Focus lands on the next animation frame. The close button is the first
    // focusable element inside the dialog, so it takes focus when no
    // initialFocusRef is supplied.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close video" })).toHaveFocus();
    });
  });

  it("moves focus to initialFocusRef when provided", async () => {
    render(<SheetHarness isOpen onClose={vi.fn()} useInitialFocus />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play" })).toHaveFocus();
    });
  });

  it("calls onClose when the dim is clicked", () => {
    const onClose = vi.fn();
    render(<SheetHarness isOpen onClose={onClose} />);

    fireEvent.click(part("dim"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("puts the dim and the card in the document, outside any portal target", () => {
    render(<SheetHarness isOpen onClose={vi.fn()} />);

    expect(part("dim").parentElement).toBe(document.body);
    expect(mover().parentElement?.parentElement).toBe(document.body);
  });

  it("renders nothing while closed", () => {
    render(<SheetHarness isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Close video" })).toBeNull();
    expect(document.querySelector('[class*="styles.dim"]')).toBeNull();
  });

  it("unmounts after isOpen turns false and the card has left", async () => {
    const clock = fakeMotionClock();
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);

    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(() => clock.advance(1));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector('[class*="styles.dim"]')).toBeNull();
  });

  it("keeps its content while it leaves, after the consumer drops it", async () => {
    const clock = fakeMotionClock();
    const sheet = (isOpen: boolean) => (
      <Sheet
        isOpen={isOpen}
        onClose={vi.fn()}
        closeLabel="Close"
        aria-label="New transaction"
      >
        {isOpen ? <p>Amount</p> : null}
      </Sheet>
    );
    const { rerender } = render(sheet(true));

    rerender(sheet(false));
    expect(within(card()).getByText("Amount")).toBeInTheDocument();
    await act(() => clock.advance(1));

    expect(screen.queryByText("Amount")).toBeNull();
  });

  it("locks the page's scroll while open", async () => {
    const clock = fakeMotionClock();
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);
    expect(document.body).toHaveAttribute("data-scroll-locked");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("relative");

    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);
    await act(() => clock.advance(1));
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
  });

  it("lets the page scroll as soon as it shows with no dim, while the card still leaves", async () => {
    const clock = fakeMotionClock();
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);
    await act(() => clock.advance(1));

    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);
    await act(() => clock.advance(0.1));
    expect(document.body).toHaveAttribute("data-scroll-locked");
    await act(() => clock.advance(0.25));
    expect(card()).toBeInTheDocument();
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
    expect(document.body.style.overflow).toBe("");
  });

  it("locks the page again when it opens while it leaves", async () => {
    const clock = fakeMotionClock();
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);
    await act(() => clock.advance(1));
    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);
    await act(() => clock.advance(0.35));
    expect(document.body).not.toHaveAttribute("data-scroll-locked");

    rerender(<SheetHarness isOpen onClose={vi.fn()} />);
    expect(document.body).toHaveAttribute("data-scroll-locked");
    expect(document.body.style.overflow).toBe("hidden");
  });

  describe("motion", () => {
    let clock: ReturnType<typeof fakeMotionClock>;

    beforeEach(() => {
      clock = fakeMotionClock();
    });

    const pointer = {
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
    };

    async function open(onClose = vi.fn()) {
      const view = render(<SheetHarness isOpen onClose={onClose} />);
      await act(() => clock.advance(1));
      return view;
    }

    it("slides the card up from below the bottom of the screen, and fades the dim in", async () => {
      layOut();
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      expect(offsetOf(mover())).toBe(444);
      expect(part("dim").style.opacity).toBe("0");
      await act(() => clock.advance(0.1));
      expect(offsetOf(mover())).toBeGreaterThan(0);
      expect(offsetOf(mover())).toBeLessThan(444);
      expect(Number(part("dim").style.opacity)).toBeGreaterThan(0);
      await act(() => clock.advance(1));
      expect(mover().style.transform).toBe("none");
      expect(part("dim").style.opacity).toBe("1");
    });

    it("slides the card back down off the screen to close, then unmounts", async () => {
      layOut();
      const onClose = vi.fn();
      const { rerender } = await open(onClose);

      fireEvent.click(screen.getByRole("button", { name: "Close video" }));
      rerender(<SheetHarness isOpen={false} onClose={onClose} />);
      await act(() => clock.advance(0.1));
      expect(offsetOf(mover())).toBeGreaterThan(0);

      await act(() => clock.advance(1));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("comes back when the consumer keeps it open after a close", async () => {
      layOut();
      await open();

      fireEvent.click(screen.getByRole("button", { name: "Close video" }));
      await act(() => clock.advance(1));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      await act(() => clock.advance(1));

      expect(mover().style.transform).toBe("none");
    });

    it("turns a close during the open from where the card is, at the speed it has", async () => {
      layOut();
      render(<SheetHarness isOpen onClose={vi.fn()} />);
      await act(() => clock.advance(0.05));
      const before = offsetOf(mover());
      await act(() => clock.advance(0.016));
      const last = offsetOf(mover());
      const rising = before - last;
      expect(rising).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: "Close video" }));
      const turned = offsetOf(mover());
      expect(Math.abs(turned - last)).toBeLessThan(rising);
      await act(() => clock.advance(0.016));

      expect(offsetOf(mover())).toBeLessThan(turned);
    });

    it("holds the card where it is when a drag takes it mid-motion", async () => {
      layOut();
      render(<SheetHarness isOpen onClose={vi.fn()} />);
      await act(() => clock.advance(0.05));
      const moving = offsetOf(mover());

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      const held = offsetOf(mover());
      const dimmed = Number(part("dim").style.opacity);
      expect(Math.abs(held - moving)).toBeLessThan(20);
      await act(() => clock.advance(0.1));

      expect(offsetOf(mover())).toBe(held);
      fireEvent.pointerMove(card(), { ...pointer, clientY: 10 });
      expect(offsetOf(mover())).toBeCloseTo(held + 10, 1);
      // The dim goes on with its fade, and the drag takes only its own share.
      expect(Number(part("dim").style.opacity)).toBeGreaterThan(dimmed * 0.9);
    });

    it("carries the speed of a fast release into the close", async () => {
      layOut();
      await open();

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      for (const y of [40, 80, 120, 160, 200]) {
        await act(() => clock.advance(0.016));
        fireEvent.pointerMove(card(), { ...pointer, clientY: y });
      }
      fireEvent.pointerUp(card(), { ...pointer, clientY: 200 });
      await act(() => clock.advance(0.016));

      // The finger moves 2.5px a ms, so the card goes on about 40px in a frame.
      expect(offsetOf(mover())).toBeGreaterThan(220);
    });

    it("springs back from a release at the speed of the drag", async () => {
      layOut();
      await open();

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      for (const y of [-10, -20, -30]) {
        await act(() => clock.advance(0.016));
        fireEvent.pointerMove(card(), { ...pointer, clientY: y });
      }
      const released = offsetOf(mover());
      fireEvent.pointerUp(card(), { ...pointer, clientY: -30 });
      await act(() => clock.advance(0.016));

      expect(offsetOf(mover())).toBeLessThan(released);
      await act(() => clock.advance(1));
      expect(mover().style.transform).toBe("none");
    });

    it("fades the card in place under reduced motion", async () => {
      layOut();
      reduceMotion();
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      expect(mover().style.transform).toBe("none");
      expect(mover().style.opacity).toBe("0");
      await act(() => clock.advance(0.1));
      expect(mover().style.transform).toBe("none");
      expect(Number(mover().style.opacity)).toBeGreaterThan(0);
      await act(() => clock.advance(0.2));
      expect(mover().style.opacity).toBe("1");
    });

    it("reports how far the dimmed page is in, up as it opens and down as it closes", async () => {
      layOut();
      const progress: number[] = [];
      render(
        <Sheet
          isOpen
          onClose={vi.fn()}
          closeLabel="Close"
          aria-label="Note"
          onProgress={(value) => progress.push(value)}
        />,
      );
      await act(() => clock.advance(1));
      expect(progress.at(-1)).toBe(1);
      expect(progress.some((value) => value > 0 && value < 1)).toBe(true);

      progress.length = 0;
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await act(() => clock.advance(1));
      expect(progress.at(-1)).toBe(0);
      expect(progress).toEqual([...progress].sort((a, b) => b - a));
    });

    describe("from an element on the page", () => {
      /** The elements at each point, from the top, as `document.elementsFromPoint` gives them. jsdom has no hit test. */
      let hits: Element[] = [];

      beforeEach(() => {
        hits = [];
        Object.defineProperty(document, "elementsFromPoint", {
          configurable: true,
          value: () => hits,
        });
      });

      afterEach(() => {
        Reflect.deleteProperty(document, "elementsFromPoint");
      });

      function setUpLift(onRead?: () => void) {
        layOut();
        const row = document.createElement("div");
        document.body.append(row);
        row.getBoundingClientRect = () => {
          onRead?.();
          return DOMRect.fromRect({ x: 0, y: 100, width: 390, height: 60 });
        };
        return row;
      }

      function LiftHarness({
        isOpen,
        row,
        onProgress,
      }: {
        isOpen: boolean;
        row: HTMLElement;
        onProgress?: (progress: number) => void;
      }) {
        return (
          <Sheet
            isOpen={isOpen}
            onClose={vi.fn()}
            closeLabel="Close"
            aria-label="Row"
            liftFrom={() => row}
            onProgress={onProgress}
          >
            <p>Body</p>
          </Sheet>
        );
      }

      it("lifts the card out of the element, then lets go of its styles", async () => {
        const row = setUpLift();
        render(<LiftHarness isOpen row={row} />);

        expect(mover().style.transform).toBe("translate(-12.00px, -300.00px)");
        expect(clips().map((clip) => clip.style.transform)).toEqual([
          "translate(0.00px, 0.00px)",
          "translate(0.00px, -320.00px)",
          "translate(0.00px, 0.00px)",
        ]);
        expect(card().style.transform).toBe("translate(0.00px, 320.00px)");
        expect(mover().parentElement?.style.overflowX).toBe("clip");
        await act(() => clock.advance(1.5));
        expect(mover().style.transform).toBe("none");
        expect(mover().parentElement?.style.overflowX).toBe("");
        for (const clip of clips()) {
          expect(clip.getAttribute("style") ?? "").toBe("");
        }
        expect(card().style.transform).toBe("");
        expect(card().querySelector("[inert]")).toBeNull();
      });

      it("keeps what floats over the element over the card, and fades it out as the card lifts", async () => {
        const row = setUpLift();
        const page = document.createElement("div");
        const button = document.createElement("button");
        button.textContent = "Add";
        page.append(button);
        document.body.append(page);
        button.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: 290, y: 90, width: 90, height: 48 });
        hits = [button, page, row, document.body];
        render(<LiftHarness isOpen row={row} />);

        const copy = () =>
          [...(mover().parentElement?.children ?? [])].find(
            (child): child is HTMLElement =>
              child instanceof HTMLElement &&
              child !== mover() &&
              child.textContent === "Add",
          );
        const shown = copy();
        expect(shown?.getAttribute("aria-hidden")).toBe("true");
        expect(shown && card().contains(shown)).toBe(false);
        expect(shown?.style.opacity).toBe("1");
        await act(() => clock.advance(0.1));
        expect(Number(copy()?.style.opacity)).toBeLessThan(1);
        await act(() => clock.advance(1.5));
        expect(copy()).toBeUndefined();
      });

      it("keeps what floated over the element as it lifted over the card as it goes back, with no new hit test", async () => {
        const row = setUpLift();
        const button = document.createElement("button");
        button.textContent = "Add";
        document.body.append(button);
        button.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: 290, y: 90, width: 90, height: 48 });
        hits = [button, row, document.body];
        const { rerender } = render(<LiftHarness isOpen row={row} />);
        await act(() => clock.advance(1.5));

        const hitTest = vi.fn(() => []);
        Object.defineProperty(document, "elementsFromPoint", {
          configurable: true,
          value: hitTest,
        });
        rerender(<LiftHarness isOpen={false} row={row} />);
        const copy = [...(mover().parentElement?.children ?? [])].find(
          (child) => child !== mover() && child.textContent === "Add",
        );
        expect(copy).toBeDefined();
        expect(hitTest).not.toHaveBeenCalled();
      });

      it("gives each clip box the corners of the card", () => {
        const row = setUpLift();
        const computed = window.getComputedStyle.bind(window);
        vi.spyOn(window, "getComputedStyle").mockImplementation(
          (element, pseudo) => {
            const style = computed(element, pseudo);
            if (element.getAttribute("role") !== "dialog") return style;
            return new Proxy(style, {
              get(target, key) {
                if (key === "getPropertyValue") {
                  return (name: string) => {
                    if (name.endsWith("-radius")) return "32px";
                    if (name.endsWith("-shape")) return "superellipse(2)";
                    return target.getPropertyValue(name);
                  };
                }
                const value: unknown = Reflect.get(target, key);
                if (typeof value !== "function") return value;
                const bound: unknown = value.bind(target);
                return bound;
              },
            });
          },
        );
        render(<LiftHarness isOpen row={row} />);

        for (const clip of clips()) {
          expect(clip.style.overflow).toBe("clip");
          expect(clip.style.borderBottomRightRadius).toBe("32px");
          expect(clip.style.getPropertyValue("corner-top-left-shape")).toBe(
            "superellipse(2)",
          );
        }
        expect(card().style.borderRadius).toBe("");
      });

      it("shrinks the card back into the element to close, then unmounts", async () => {
        const row = setUpLift();
        const { rerender } = render(<LiftHarness isOpen row={row} />);
        await act(() => clock.advance(1.5));

        rerender(<LiftHarness isOpen={false} row={row} />);
        await act(() => clock.advance(0.1));
        expect(mover().style.transform).toMatch(/^translate\(/);
        expect(card().style.transform).toMatch(/^translate\(0\.00px, [1-9]/);

        await act(() => clock.advance(1.5));
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      it("shrinks back into the element as it was before the card opened, while the element shows as current", async () => {
        const row = setUpLift();
        row.dataset.row = "";
        const list = document.createElement("div");
        list.style.backgroundColor = "rgb(10, 20, 30)";
        list.append(row);
        document.body.append(list);
        const rowStyle = document.createElement("style");
        rowStyle.textContent =
          "[aria-current=true] { background-color: rgb(200, 200, 200); }";
        document.head.append(rowStyle);
        const { rerender } = render(<LiftHarness isOpen row={row} />);
        const copyOf = () => card().querySelector<HTMLElement>("[data-row]");
        await act(() => clock.advance(1.5));
        row.setAttribute("aria-current", "true");

        rerender(<LiftHarness isOpen={false} row={row} />);

        expect(copyOf()?.hasAttribute("aria-current")).toBe(false);
        expect(copyOf()?.style.backgroundColor).toBe("rgb(10, 20, 30)");
        rowStyle.remove();
      });

      it("follows the element where the page under the card moves it", async () => {
        layOut();
        const row = document.createElement("div");
        document.body.append(row);
        let top = 100;
        row.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: 0, y: top, width: 390, height: 60 });
        render(<LiftHarness isOpen row={row} />);
        await act(() => clock.advance(0.032));
        const before = translateOf(mover().style.transform);

        top = 160;
        await act(() => clock.advance(0.032));

        // The card is part of the way out of the element, so it takes part
        // of the move of the element.
        const after = translateOf(mover().style.transform);
        expect(after.y - before.y).toBeGreaterThan(5);
      });

      it("moves the page under the card back with the card, and lets it go after the close", async () => {
        layOut();
        const view = document.createElement("div");
        const row = document.createElement("div");
        view.append(row);
        document.body.append(view);
        row.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: 0, y: 100, width: 390, height: 60 });
        view.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: 0, y: 0, width: 390, height: 844 });
        const harness = (isOpen: boolean) => (
          <SheetRecedeContext value={view}>
            <LiftHarness isOpen={isOpen} row={row} />
          </SheetRecedeContext>
        );
        const { rerender } = render(harness(true));
        await act(() => clock.advance(1.5));
        expect(view.style.transform).toBe("translateY(10.00px) scale(0.9350)");
        expect(view.style.transformOrigin).toBe("50% 0");
        expect(view.style.overflow).toBe("clip");

        rerender(harness(false));
        await act(() => clock.advance(1.5));
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(view.getAttribute("style") ?? "").toBe("");
      });

      it("leaves the page under the card to the outer Sheet when a Sheet in the card closes", async () => {
        layOut();
        const view = document.createElement("div");
        const row = document.createElement("div");
        view.append(row);
        document.body.append(view);
        row.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: 0, y: 100, width: 390, height: 60 });
        view.getBoundingClientRect = () =>
          DOMRect.fromRect({ x: 0, y: 0, width: 390, height: 844 });
        const harness = (isInnerOpen: boolean) => (
          <SheetRecedeContext value={view}>
            <Sheet
              isOpen
              onClose={vi.fn()}
              closeLabel="Close"
              aria-label="Row"
              liftFrom={() => row}
            >
              <Sheet
                isOpen={isInnerOpen}
                onClose={vi.fn()}
                closeLabel="Close"
                aria-label="Inner"
              >
                <p>Inner</p>
              </Sheet>
            </Sheet>
          </SheetRecedeContext>
        );
        const { rerender } = render(harness(true));
        await act(() => clock.advance(1.5));

        rerender(harness(false));
        await act(() => clock.advance(1.5));

        expect(screen.queryByRole("dialog", { name: "Inner" })).toBeNull();
        expect(view.style.transform).toBe("translateY(10.00px) scale(0.9350)");
      });
    });
  });

  describe("drag to dismiss", () => {
    const pointer = {
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
    };
    let clock: ReturnType<typeof fakeMotionClock>;

    beforeEach(() => {
      clock = fakeMotionClock();
    });

    /** Lets the motion of the open come to rest. */
    async function settle() {
      await act(() => clock.advance(1));
    }

    it("moves the card with a drag down on the grabber", async () => {
      render(<SheetHarness isOpen onClose={vi.fn()} />);
      await settle();

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 30 });

      expect(offsetOf(mover())).toBe(30);
    });

    it("keeps the card opaque under the finger past the bottom of the screen, and fades the dim with the distance", async () => {
      layOut();
      render(<SheetHarness isOpen onClose={vi.fn()} />);
      await settle();

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 222 });
      expect(mover().style.opacity).toBe("1");
      expect(part("dim").style.opacity).toBe("0.5");

      fireEvent.pointerMove(card(), { ...pointer, clientY: 600 });
      expect(offsetOf(mover())).toBe(600);
      expect(mover().style.opacity).toBe("1");
      expect(mover().style.getPropertyValue("mask-image")).toBe("");
      expect(part("dim").style.opacity).toBe("0");
    });

    it("closes the sheet when a drag goes far enough", async () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);
      await settle();

      drag(part("grabber"), [40, 120, 200]);

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("springs back when a slow drag stops short", async () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);
      await settle();

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      for (const y of [10, 20, 30]) {
        await act(() => clock.advance(0.5));
        fireEvent.pointerMove(card(), { ...pointer, clientY: y });
      }
      fireEvent.pointerUp(card(), { ...pointer, clientY: 30 });
      await act(() => clock.advance(1));

      expect(onClose).not.toHaveBeenCalled();
      expect(mover().style.transform).toBe("none");
    });

    it("resists a drag up", async () => {
      render(<SheetHarness isOpen onClose={vi.fn()} />);
      await settle();

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 300 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 0 });

      const moved = Number(/-?[\d.]+/.exec(mover().style.transform)?.[0]);
      expect(moved).toBeLessThan(0);
      expect(moved).toBeGreaterThan(-100);
    });

    it("drags from the content with a touch while it is scrolled to the top", async () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);
      await settle();

      drag(screen.getByRole("button", { name: "Play" }), [40, 120, 200], {
        pointerType: "touch",
      });

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("leaves the content to a mouse, so it can still select text", async () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);
      await settle();

      drag(screen.getByRole("button", { name: "Play" }), [40, 120, 200]);

      expect(onClose).not.toHaveBeenCalled();
      expect(mover().style.transform).toBe("none");
    });

    it("leaves a pull to the scroll while the content is scrolled down", async () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);
      await settle();
      const play = screen.getByRole("button", { name: "Play" });
      const scroller = play.parentElement;
      if (!scroller) throw new Error("no scroller");
      scroller.scrollTop = 80;

      drag(play, [40, 120, 200], { pointerType: "touch" });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe("Sheet in a SheetBoundary", () => {
  it("opens in the boundary and leaves the scroll of the page alone", async () => {
    render(
      <SheetBoundary>
        <p>Frame</p>
        <SheetHarness isOpen onClose={() => {}} />
      </SheetBoundary>,
    );
    const dialog = await screen.findByRole("dialog", { name: "Video player" });
    const boundary = screen.getByText("Frame").parentElement;
    expect(boundary?.contains(dialog)).toBe(true);
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

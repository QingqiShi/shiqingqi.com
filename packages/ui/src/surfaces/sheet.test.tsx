import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "./sheet.tsx";

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

/** Asks for reduced motion, and for nothing else. */
function reduceMotion() {
  const real = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const list = real(query);
    Object.defineProperty(list, "matches", { value: query.includes("reduce") });
    return list;
  });
}

interface AnimationStub {
  cancel: () => void;
  onfinish: (() => void) | null;
}

/**
 * Records every Web Animation the sheet starts. They never finish unless the
 * test calls `finishAll`.
 */
function recordAnimations() {
  const started: { element: Element; keyframes: Keyframe[] }[] = [];
  const running: AnimationStub[] = [];
  Element.prototype.animate = function (
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  ) {
    started.push({
      element: this,
      keyframes: Array.isArray(keyframes) ? keyframes : [],
    });
    const stub: AnimationStub = { cancel: vi.fn(), onfinish: null };
    running.push(stub);
    // eslint-disable-next-line no-restricted-syntax -- the stub carries only the fields the sheet's controller uses on an Animation
    return stub as unknown as Animation;
  };
  const finishAll = () => {
    for (const stub of running.splice(0)) stub.onfinish?.();
    started.length = 0;
  };
  return Object.assign(started, { finishAll });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "animate");
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
    expect(card().parentElement?.parentElement).toBe(document.body);
  });

  it("renders nothing while closed", () => {
    render(<SheetHarness isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Close video" })).toBeNull();
    expect(document.querySelector('[class*="styles.dim"]')).toBeNull();
  });

  it("unmounts after isOpen turns false", () => {
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);

    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector('[class*="styles.dim"]')).toBeNull();
  });

  it("locks the page's scroll while open", () => {
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);
    expect(document.body).toHaveAttribute("data-scroll-locked");

    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  });

  describe("motion", () => {
    function cardMotion(started: ReturnType<typeof recordAnimations>) {
      return started.filter(({ element }) => element === card());
    }

    it("slides the card up from below the bottom of the screen, and fades the dim in", () => {
      layOut();
      const started = recordAnimations();

      render(<SheetHarness isOpen onClose={vi.fn()} />);

      expect(cardMotion(started).map(({ keyframes }) => keyframes)).toEqual([
        [{ transform: "translateY(444px)" }, { transform: "none" }],
      ]);
      expect(started.filter(({ element }) => element === part("dim"))).toEqual([
        { element: part("dim"), keyframes: [{ opacity: 0 }, { opacity: 1 }] },
      ]);
    });

    it("slides the card back down off the screen to close", () => {
      layOut();
      const started = recordAnimations();
      render(<SheetHarness isOpen onClose={vi.fn()} />);
      started.finishAll();

      fireEvent.click(screen.getByRole("button", { name: "Close video" }));

      expect(cardMotion(started).map(({ keyframes }) => keyframes)).toEqual([
        [{ transform: "none" }, { transform: "translateY(444px)" }],
      ]);
    });

    it("fades the card in place under reduced motion", () => {
      layOut();
      reduceMotion();
      const started = recordAnimations();

      render(<SheetHarness isOpen onClose={vi.fn()} />);

      expect(cardMotion(started).map(({ keyframes }) => keyframes)).toEqual([
        [{ opacity: 0 }, { opacity: 1 }],
      ]);
    });

    it("makes the dim as tall as the document plus one screen", () => {
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      const height = part("dim").style.blockSize;
      expect(height).toContain("100lvh");
      expect(height).toMatch(/\d+px/);
    });
  });

  describe("drag to dismiss", () => {
    const pointer = {
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
    };

    it("moves the card with a drag down on the grabber", () => {
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 30 });

      expect(card().style.transform).toBe("translateY(30px)");
    });

    it("keeps the card opaque under the finger past the bottom of the screen, and fades the dim with the distance", () => {
      layOut();
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 222 });
      expect(card().style.opacity).toBe("");
      expect(part("dim").style.opacity).toBe("0.5");

      fireEvent.pointerMove(card(), { ...pointer, clientY: 600 });
      expect(card().style.transform).toBe("translateY(600px)");
      expect(card().style.opacity).toBe("");
      expect(card().style.getPropertyValue("mask-image")).toBe("");
      expect(part("dim").style.opacity).toBe("0");
    });

    it("closes the sheet when a drag goes far enough", () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);

      drag(part("grabber"), [40, 120, 200]);

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("springs back when a slow drag stops short", () => {
      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => (now += 500));
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);

      drag(part("grabber"), [10, 20, 30]);

      expect(onClose).not.toHaveBeenCalled();
      expect(card().style.transform).toBe("");
    });

    it("resists a drag up", () => {
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 300 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 0 });

      const moved = Number(/-?[\d.]+/.exec(card().style.transform)?.[0]);
      expect(moved).toBeLessThan(0);
      expect(moved).toBeGreaterThan(-100);
    });

    it("drags from the content with a touch while it is scrolled to the top", () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);

      drag(screen.getByRole("button", { name: "Play" }), [40, 120, 200], {
        pointerType: "touch",
      });

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("leaves the content to a mouse, so it can still select text", () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);

      drag(screen.getByRole("button", { name: "Play" }), [40, 120, 200]);

      expect(onClose).not.toHaveBeenCalled();
      expect(card().style.transform).toBe("");
    });

    it("leaves a pull to the scroll while the content is scrolled down", () => {
      const onClose = vi.fn();
      render(<SheetHarness isOpen onClose={onClose} />);
      const play = screen.getByRole("button", { name: "Play" });
      const scroller = play.parentElement;
      if (!scroller) throw new Error("no scroller");
      scroller.scrollTop = 80;

      drag(play, [40, 120, 200], { pointerType: "touch" });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

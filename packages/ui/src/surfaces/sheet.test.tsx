import {
  act,
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

/** The box around the card that the motion moves. */
function mover() {
  const element = card().parentElement;
  if (!element) throw new Error("The card has no mover");
  return element;
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

/**
 * A Web Animation that runs until the test finishes it. jsdom has none.
 */
class HeldAnimation extends EventTarget implements Animation {
  currentTime = null;
  effect = null;
  id = "";
  oncancel = null;
  onfinish = null;
  onremove = null;
  overallProgress = null;
  pending = false;
  playState: AnimationPlayState = "running";
  playbackRate = 1;
  replaceState: AnimationReplaceState = "active";
  startTime = null;
  timeline = null;
  readonly finished: Promise<Animation>;
  readonly ready: Promise<Animation>;
  readonly element: Element;
  readonly #keyframes: Keyframe[];
  readonly #resolve: (animation: Animation) => void;
  readonly #onCancel: (animation: HeldAnimation) => void;

  constructor(
    element: Element,
    keyframes: Keyframe[],
    onCancel: (animation: HeldAnimation) => void,
  ) {
    super();
    const { promise, resolve } = Promise.withResolvers<Animation>();
    this.finished = promise;
    this.ready = Promise.resolve(this);
    this.element = element;
    this.#keyframes = keyframes;
    this.#resolve = resolve;
    this.#onCancel = onCancel;
  }

  finish() {
    this.playState = "finished";
    this.#resolve(this);
  }

  cancel() {
    this.playState = "idle";
    this.#onCancel(this);
  }

  commitStyles() {
    if (!(this.element instanceof HTMLElement)) return;
    for (const [property, value] of Object.entries(
      this.#keyframes.at(-1) ?? {},
    )) {
      this.element.style.setProperty(property, String(value));
    }
  }

  pause() {
    this.playState = "paused";
  }

  play() {
    this.playState = "running";
  }

  persist() {
    this.replaceState = "persisted";
  }

  reverse() {
    this.playbackRate = -this.playbackRate;
  }

  updatePlaybackRate(playbackRate: number) {
    this.playbackRate = playbackRate;
  }
}

/**
 * Records every Web Animation the sheet starts. They never finish unless the
 * test calls `finishAll`, which puts each element where its animation ends.
 */
function recordAnimations() {
  const started: { element: Element; keyframes: Keyframe[] }[] = [];
  const running = new Set<HeldAnimation>();
  Element.prototype.animate = function (
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  ) {
    const frames = Array.isArray(keyframes) ? keyframes : [];
    started.push({ element: this, keyframes: frames });
    const animation = new HeldAnimation(this, frames, (cancelled) => {
      running.delete(cancelled);
    });
    running.add(animation);
    return animation;
  };
  Element.prototype.getAnimations = function (this: Element) {
    return [...running].filter(({ element }) => element === this);
  };
  const finishAll = async () => {
    started.length = 0;
    for (const animation of running) animation.finish();
    await act(async () => {
      await Promise.resolve();
    });
  };
  return Object.assign(started, { finishAll });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "animate");
  Reflect.deleteProperty(Element.prototype, "getAnimations");
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
      return started.filter(({ element }) => element === mover());
    }

    it("slides the card up from below the bottom of the screen, and fades the dim in", () => {
      layOut();
      const started = recordAnimations();

      render(<SheetHarness isOpen onClose={vi.fn()} />);

      expect(mover().style.transform).toBe("translateY(444px)");
      expect(cardMotion(started).map(({ keyframes }) => keyframes)).toEqual([
        [{ transform: "none" }],
      ]);
      expect(part("dim").style.opacity).toBe("0");
      expect(started.filter(({ element }) => element === part("dim"))).toEqual([
        { element: part("dim"), keyframes: [{ opacity: "1" }] },
      ]);
    });

    it("slides the card back down off the screen to close, then unmounts", async () => {
      layOut();
      const started = recordAnimations();
      const onClose = vi.fn();
      const { rerender } = render(<SheetHarness isOpen onClose={onClose} />);
      await started.finishAll();
      expect(mover().style.transform).toBe("none");

      fireEvent.click(screen.getByRole("button", { name: "Close video" }));
      rerender(<SheetHarness isOpen={false} onClose={onClose} />);

      expect(cardMotion(started).map(({ keyframes }) => keyframes)).toEqual([
        [{ transform: "translateY(444px)" }],
      ]);
      await started.finishAll();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("comes back when the consumer keeps it open after a close", async () => {
      layOut();
      const started = recordAnimations();
      render(<SheetHarness isOpen onClose={vi.fn()} />);
      await started.finishAll();

      fireEvent.click(screen.getByRole("button", { name: "Close video" }));
      await started.finishAll();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(cardMotion(started).map(({ keyframes }) => keyframes)).toEqual([
        [{ transform: "none" }],
      ]);
    });

    it("fades the card in place under reduced motion", () => {
      layOut();
      reduceMotion();
      const started = recordAnimations();

      render(<SheetHarness isOpen onClose={vi.fn()} />);

      expect(cardMotion(started).map(({ keyframes }) => keyframes)).toEqual([
        [{ opacity: "1" }],
      ]);
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

      expect(mover().style.transform).toBe("translateY(30px)");
    });

    it("keeps the card opaque under the finger past the bottom of the screen, and fades the dim with the distance", () => {
      layOut();
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 0 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 222 });
      expect(mover().style.opacity).toBe("1");
      expect(part("dim").style.opacity).toBe("0.5");

      fireEvent.pointerMove(card(), { ...pointer, clientY: 600 });
      expect(mover().style.transform).toBe("translateY(600px)");
      expect(mover().style.opacity).toBe("1");
      expect(mover().style.getPropertyValue("mask-image")).toBe("");
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
      expect(mover().style.transform).toBe("none");
    });

    it("resists a drag up", () => {
      render(<SheetHarness isOpen onClose={vi.fn()} />);

      fireEvent.pointerDown(part("grabber"), { ...pointer, clientY: 300 });
      fireEvent.pointerMove(card(), { ...pointer, clientY: 0 });

      const moved = Number(/-?[\d.]+/.exec(mover().style.transform)?.[0]);
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
      expect(mover().style.transform).toBe("none");
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

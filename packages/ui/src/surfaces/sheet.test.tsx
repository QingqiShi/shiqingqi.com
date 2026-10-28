import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { Sheet } from "./sheet.tsx";

function SheetHarness({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel="Close video"
      aria-label="Video player"
    >
      <button type="button">Play</button>
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

afterEach(() => {
  vi.useRealTimers();
});

describe("Sheet", () => {
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

  it("calls onClose when the dim is clicked", () => {
    const onClose = vi.fn();
    render(<SheetHarness isOpen onClose={onClose} />);

    fireEvent.click(part("dim"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus into the sheet when it opens", async () => {
    render(<SheetHarness isOpen onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close video" })).toHaveFocus();
    });
  });

  it("unmounts after isOpen turns false and the card has left", async () => {
    const clock = fakeMotionClock();
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);

    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);
    await act(() => clock.advance(1));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector('[class*="styles.dim"]')).toBeNull();
  });

  it("locks the page's scroll while open, and releases it after it closes", async () => {
    const clock = fakeMotionClock();
    const { rerender } = render(<SheetHarness isOpen onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<SheetHarness isOpen={false} onClose={vi.fn()} />);
    await act(() => clock.advance(1));
    expect(document.body.style.overflow).toBe("");
  });

  describe("drag to dismiss", () => {
    async function openAndSettle(onClose: () => void) {
      const clock = fakeMotionClock();
      render(<SheetHarness isOpen onClose={onClose} />);
      await act(() => clock.advance(1));
    }

    it("closes the sheet when a drag goes far enough", async () => {
      const onClose = vi.fn();
      await openAndSettle(onClose);

      drag(part("grabber"), [40, 120, 200]);

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("leaves the content to a mouse, so it can still select text", async () => {
      const onClose = vi.fn();
      await openAndSettle(onClose);

      drag(screen.getByRole("button", { name: "Play" }), [40, 120, 200]);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("leaves a pull to the scroll while the content is scrolled down", async () => {
      const onClose = vi.fn();
      await openAndSettle(onClose);
      const play = screen.getByRole("button", { name: "Play" });
      const scroller = play.parentElement;
      if (!scroller) throw new Error("no scroller");
      scroller.scrollTop = 80;

      drag(play, [40, 120, 200], { pointerType: "touch" });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

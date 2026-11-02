import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  useRef,
  type FocusEventHandler,
  type PointerEventHandler,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { usePressHandlers } from "./use-press-handlers.ts";

function PressProbe({
  onBlur,
  onPointerCancel,
}: {
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  onPointerCancel?: PointerEventHandler<HTMLButtonElement>;
}) {
  const targetRef = useRef<HTMLButtonElement>(null);
  const { isPressed, handlers } = usePressHandlers({
    targetRef,
    onBlur,
    onPointerCancel,
  });
  return (
    <button ref={targetRef} data-pressed={isPressed} {...handlers}>
      Press
    </button>
  );
}

describe("usePressHandlers", () => {
  it("ends the press when the browser cancels the pointer", async () => {
    const onPointerCancel = vi.fn();
    render(<PressProbe onPointerCancel={onPointerCancel} />);
    const target = screen.getByRole("button");

    fireEvent.pointerDown(target, { pointerId: 1 });
    expect(target).toHaveAttribute("data-pressed", "true");

    fireEvent.pointerCancel(target, { pointerId: 1 });

    await waitFor(() => {
      expect(target).toHaveAttribute("data-pressed", "false");
    });
    expect(onPointerCancel).toHaveBeenCalledTimes(1);
  });

  // A browser sends no click on keyup when the Space keydown has its default
  // prevented. jsdom does not send that click, so the test reads the keydown.
  it("leaves the default of a Space keydown to the browser", () => {
    render(<PressProbe />);
    const target = screen.getByRole("button");

    const defaultAllowed = fireEvent.keyDown(target, { key: " " });

    expect(defaultAllowed).toBe(true);
    expect(target).toHaveAttribute("data-pressed", "true");
  });

  it("ends a key press when focus leaves before the keyup", async () => {
    const onBlur = vi.fn();
    render(<PressProbe onBlur={onBlur} />);
    const target = screen.getByRole("button");

    fireEvent.keyDown(target, { key: " " });
    expect(target).toHaveAttribute("data-pressed", "true");

    fireEvent.blur(target);

    await waitFor(() => {
      expect(target).toHaveAttribute("data-pressed", "false");
    });
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

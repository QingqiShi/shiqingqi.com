import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { px } from "./px.ts";
import { useBinding } from "./use-binding.ts";
import { useMotionEngine, useMotionValue } from "./use-motion-engine.ts";

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function Slider({ scale }: { scale: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const engine = useMotionEngine();
  const x = useMotionValue(engine, 0, { precision: 0.5 });
  useBinding(ref, x, {
    pose: (value) => ({ transform: `translateX(${px(value * scale)})` }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        x.to(50);
      }}
    >
      Slide
    </button>
  );
}

describe("useBinding", () => {
  it("binds while mounted, with the pose of the latest render", async () => {
    const { getByRole, rerender, unmount } = render(<Slider scale={1} />);
    const slider = getByRole("button");
    expect(slider.style.transform).toBe("translateX(0.00px)");
    rerender(<Slider scale={2} />);
    fireEvent.click(slider);
    await clock.advance(3);
    expect(slider.style.transform).toBe("translateX(100.00px)");
    unmount();
    expect(slider.style.transform).toBe("");
  });
});

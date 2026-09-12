import type Link from "next/link";
import type { ComponentProps, MouseEventHandler } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { usePrefetchOnIntent } from "./use-prefetch-on-intent.ts";

interface ProbeProps {
  prefetch?: ComponentProps<typeof Link>["prefetch"];
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
}

/** Stands in for the anchor the hook drives: `prefetch` is not a DOM attribute. */
function Probe({ prefetch, onMouseEnter }: ProbeProps) {
  const intent = usePrefetchOnIntent<HTMLAnchorElement>({
    prefetch,
    onMouseEnter,
  });
  return (
    <a
      href="https://example.com/"
      data-prefetch={String(intent.prefetch)}
      onMouseEnter={intent.onMouseEnter}
      onFocus={intent.onFocus}
    >
      Probe
    </a>
  );
}

describe("usePrefetchOnIntent", () => {
  it("holds prefetching back until the pointer arrives", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-prefetch", "false");

    await user.hover(link);

    // `null` hands control back to Next.js, which prefetches on its own rules
    // from here on.
    expect(link).toHaveAttribute("data-prefetch", "null");
  });

  it("treats focus as the same signal, so the keyboard keeps prefetch parity", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await user.tab();

    expect(screen.getByRole("link")).toHaveAttribute("data-prefetch", "null");
  });

  it("keeps prefetching off for a caller that opted out", async () => {
    const user = userEvent.setup();
    render(<Probe prefetch={false} />);

    const link = screen.getByRole("link");
    await user.hover(link);

    expect(link).toHaveAttribute("data-prefetch", "false");
  });

  it("still calls the caller's own handler", async () => {
    const onMouseEnter = vi.fn();
    const user = userEvent.setup();
    render(<Probe onMouseEnter={onMouseEnter} />);

    await user.hover(screen.getByRole("link"));

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });
});

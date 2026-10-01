import type Link from "next/link";
import {
  useState,
  type ComponentProps,
  type FocusEventHandler,
  type MouseEventHandler,
} from "react";

type PrefetchProp = ComponentProps<typeof Link>["prefetch"];

interface PrefetchOnIntentOptions<T extends HTMLElement> {
  /** The caller's own setting. `false` opts out of prefetching altogether. */
  prefetch?: PrefetchProp;
  onMouseEnter?: MouseEventHandler<T>;
  onFocus?: FocusEventHandler<T>;
}

interface PrefetchOnIntentResult<T extends HTMLElement> {
  prefetch: PrefetchProp;
  onMouseEnter: MouseEventHandler<T>;
  onFocus: FocusEventHandler<T>;
}

/**
 * Holds Next.js's hover/focus prefetching back until the visitor signals
 * intent, then hands control back to the framework by flipping `prefetch` to
 * `null`. Wiring both the pointer and the keyboard signal keeps prefetch parity
 * for keyboard and assistive-tech users.
 */
export function usePrefetchOnIntent<T extends HTMLElement>({
  prefetch,
  onMouseEnter,
  onFocus,
}: PrefetchOnIntentOptions<T>): PrefetchOnIntentResult<T> {
  const [intent, setIntent] = useState(false);

  return {
    prefetch: prefetch === false ? false : intent ? null : false,
    onMouseEnter: (event) => {
      setIntent(true);
      onMouseEnter?.(event);
    },
    onFocus: (event) => {
      setIntent(true);
      onFocus?.(event);
    },
  };
}

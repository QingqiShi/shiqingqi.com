"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { useState } from "react";
import { border, color } from "#src/tokens.stylex.ts";
import { anchorTokens } from "./anchor.stylex";
import { ExternalLinkIndicator } from "./external-link-indicator";

interface AnchorExtraProps {
  /**
   * Show the external-link icon and screen-reader "opens in new tab" label
   * when `target="_blank"`. Defaults to true. Opt out for wrappers that
   * already render their own external-link affordance (e.g. `Card`, or
   * icon-slot-driven buttons).
   */
  indicateExternal?: boolean;
}

export function Anchor({
  className,
  style,
  prefetch,
  onMouseEnter,
  onFocus,
  rel,
  target,
  ref,
  children,
  indicateExternal = true,
  ...props
}: React.ComponentProps<typeof Link> & AnchorExtraProps) {
  // Defer Next.js's hover/focus prefetching until the user signals intent,
  // then hand control back to the framework by flipping `prefetch` to `null`.
  // Wiring both pointer and keyboard signals keeps prefetch parity for
  // keyboard and assistive-tech users.
  const [intent, setIntent] = useState(false);

  // Automatically ensure noopener and noreferrer are present for _blank links
  const resolvedRel =
    target === "_blank" ? mergeRel(rel, "noopener noreferrer") : rel;

  const showIndicator = indicateExternal && target === "_blank";

  return (
    <Link
      {...props}
      target={target}
      rel={resolvedRel}
      ref={ref}
      prefetch={prefetch === false ? false : intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
      className={className}
      style={style}
      css={styles.a}
    >
      {children}
      {showIndicator && <ExternalLinkIndicator />}
    </Link>
  );
}

/**
 * Merges rel tokens, deduplicating any that already exist.
 */
function mergeRel(existing: string | undefined, required: string): string {
  if (!existing) return required;
  const tokens = new Set(existing.split(/\s+/));
  for (const token of required.split(/\s+/)) {
    tokens.add(token);
  }
  return [...tokens].join(" ");
}

const styles = stylex.create({
  a: {
    color: anchorTokens.color,
    fontWeight: anchorTokens.fontWeight,
    textDecorationThickness: { default: null, ":hover": border.size_2 },
    outline: {
      default: "none",
      ":focus-visible": `2px solid ${color.controlActive}`,
    },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
});

"use client";

import * as stylex from "@stylexjs/stylex";
import { anchorTokens } from "@tuja/ui/components/anchor.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { border } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import Link from "next/link";
import { usePrefetchOnIntent } from "#src/hooks/use-prefetch-on-intent.ts";
import { ExternalLinkIndicator } from "./external-link-indicator";

interface AnchorExtraProps {
  /**
   * Show the external-link icon and screen-reader "opens in new tab" label
   * when `target="_blank"`. Defaults to true. Opt out for wrappers that
   * already render their own external-link affordance (e.g. `Card`, or
   * icon-slot-driven buttons).
   */
  indicateExternal?: boolean;
  css?: StyleProp;
}

export function Anchor({
  css,
  prefetch,
  onMouseEnter,
  onFocus,
  rel,
  target,
  ref,
  children,
  indicateExternal = true,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "className" | "style"> &
  AnchorExtraProps) {
  const intent = usePrefetchOnIntent<HTMLAnchorElement>({
    prefetch,
    onMouseEnter,
    onFocus,
  });

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
      prefetch={intent.prefetch}
      onMouseEnter={intent.onMouseEnter}
      onFocus={intent.onFocus}
      {...stylex.props(styles.a, a11y.focusRing, css)}
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
  },
});

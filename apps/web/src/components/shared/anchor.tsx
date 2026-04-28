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
  rel,
  target,
  ref,
  children,
  indicateExternal = true,
  ...props
}: React.ComponentProps<typeof Link> & AnchorExtraProps) {
  const [hovered, setHovered] = useState(false);

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
      prefetch={prefetch === false ? false : hovered ? null : false}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
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

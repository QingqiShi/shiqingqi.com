"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { useState } from "react";
import { border } from "#src/tokens.stylex.ts";
import { anchorTokens } from "./anchor.stylex";

export function Anchor({
  className,
  style,
  prefetch,
  onMouseEnter,
  rel,
  target,
  ref,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [hovered, setHovered] = useState(false);

  // Automatically ensure noopener and noreferrer are present for _blank links
  const resolvedRel =
    target === "_blank" ? mergeRel(rel, "noopener noreferrer") : rel;

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
    />
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

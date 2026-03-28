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
  ref,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      {...props}
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

const styles = stylex.create({
  a: {
    color: anchorTokens.color,
    fontWeight: anchorTokens.fontWeight,
    textDecorationThickness: { default: null, ":hover": border.size_2 },
  },
});

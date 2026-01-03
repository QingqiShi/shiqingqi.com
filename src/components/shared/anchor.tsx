"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { useState } from "react";
import { border } from "#src/tokens.stylex.ts";
import { anchorTokens } from "./anchor.stylex";

export function Anchor({
  className,
  style,
  onMouseEnter,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [prefetch, setPrefetch] = useState(false);

  return (
    <Link
      {...props}
      prefetch={prefetch ? null : false}
      onMouseEnter={(e) => {
        setPrefetch(true);
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

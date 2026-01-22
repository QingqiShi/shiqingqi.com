"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { forwardRef, useState } from "react";
import { border } from "#src/tokens.stylex.ts";
import { anchorTokens } from "./anchor.stylex";

export const Anchor = forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof Link>
>(function Anchor({ className, style, onMouseEnter, ...props }, ref) {
  const [prefetch, setPrefetch] = useState(false);

  return (
    <Link
      {...props}
      ref={ref}
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
});

const styles = stylex.create({
  a: {
    color: anchorTokens.color,
    fontWeight: anchorTokens.fontWeight,
    textDecorationThickness: { default: null, ":hover": border.size_2 },
  },
});

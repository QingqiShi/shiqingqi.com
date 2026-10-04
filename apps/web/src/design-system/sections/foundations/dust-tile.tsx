"use client";

import * as stylex from "@stylexjs/stylex";
import { useDust } from "@tuja/ui/hooks/use-dust";
import { useExtractorFan } from "@tuja/ui/hooks/use-extractor-fan";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";

interface BenchElementProps {
  /** A data attribute that names the element for the end-to-end tests. */
  attributes?: Record<`data-${string}`, string>;
  css?: StyleProp;
}

export function Token({ children }: { children: ReactNode }) {
  return <span css={styles.token}>{children}</span>;
}

export function DustTile({
  attributes,
  css,
  density,
}: BenchElementProps & { density: number }) {
  const ref = useDust({ density });
  return (
    <div
      ref={ref}
      data-effect-registered=""
      {...attributes}
      css={[flex.center, corner.radius_2, styles.tile, css]}
    >
      <Token>useDust</Token>
    </div>
  );
}

export function Fan({
  attributes,
  css,
  reach,
}: BenchElementProps & { reach: number }) {
  const ref = useExtractorFan({ reach });
  return (
    <div
      ref={ref}
      data-effect-registered=""
      {...attributes}
      css={[flex.center, corner.radius_round, styles.fan, css]}
    >
      <Token>reach={reach}</Token>
    </div>
  );
}

const styles = stylex.create({
  tile: {
    flexShrink: 0,
    inlineSize: space._10,
    blockSize: space._10,
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
  },
  fan: {
    flexShrink: 0,
    inlineSize: space._10,
    blockSize: space._10,
    color: color.fgMuted,
    backgroundColor: color.bgSurfaceSunken,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
  },
});

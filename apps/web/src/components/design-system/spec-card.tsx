import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Identifier } from "./identifier.tsx";

interface SpecCardProps {
  token: string;
  meta: string;
  children: ReactNode;
}

export function SpecCard({ token, meta, children }: SpecCardProps) {
  return (
    <div css={[corner.radius_2, styles.card]}>
      <div css={styles.header}>
        <span css={styles.token}>
          <Identifier>{token}</Identifier>
        </span>
        <span css={styles.meta}>{meta}</span>
      </div>
      {children}
    </div>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_2,
    color: color.textSubtle,
  },
  meta: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
});

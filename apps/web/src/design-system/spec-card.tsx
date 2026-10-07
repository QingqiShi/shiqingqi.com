import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
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
      <div css={styles.label}>
        <span css={[typeRole.caption, styles.token]}>
          <Identifier>{token}</Identifier>
        </span>
        <span css={[typeRole.caption, styles.meta]}>{meta}</span>
      </div>
      {children}
    </div>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    paddingBlock: space._3,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    minInlineSize: 0,
  },
  // Two lines of one label, so they sit at their line height and not a gap.
  label: {
    minInlineSize: 0,
  },
  token: {
    display: "block",
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  meta: {
    display: "block",
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
});

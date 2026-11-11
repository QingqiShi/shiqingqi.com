import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
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
        <Text as="span" look="caption" tone="muted" css={styles.token}>
          <Identifier>{token}</Identifier>
        </Text>
        <Text as="span" look="caption" tone="muted" css={styles.meta}>
          {meta}
        </Text>
      </div>
      {children}
    </div>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    paddingBlock: space._3,
    paddingInline: space._3,
    backgroundColor: color.popover,
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
  },
  meta: {
    display: "block",
    fontFamily: font.familyMono,
  },
});

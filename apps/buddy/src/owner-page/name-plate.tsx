"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import { fillTemplate } from "#src/pet/fill-template.ts";
import { PIPS } from "#src/pet/levels.ts";

type NamePlateDetail = {
  levelLabel: string;
  /** Filled growth pips, of `PIPS`. */
  pips: number;
  /** One plain line: awake or asleep, and when the Mac last worked. */
  status: string;
};

type NamePlateProps = {
  name: string;
  /** How far the pet has grown and how it is doing. Null before the first upload, when neither means anything yet. */
  detail: NamePlateDetail | null;
};

/** Under the scene: who lives there and, once there is data, how far it has grown and how it is doing. */
export function NamePlate({ name, detail }: NamePlateProps) {
  return (
    <header css={styles.plate}>
      <div css={[row.tight, styles.head]}>
        <Heading level={1} look="h2">
          {name}
        </Heading>
        {detail === null ? null : (
          <>
            <span css={[typeRole.label, styles.level]}>
              {detail.levelLabel}
            </span>
            <Pips filled={detail.pips} />
          </>
        )}
      </div>
      {detail === null ? null : (
        <Text as="span" look="bodySmall" tone="muted">
          {detail.status}
        </Text>
      )}
    </header>
  );
}

/** The way to the next level: a filled dot for each step taken, a ring for each step still to go. */
function Pips({ filled }: { filled: number }) {
  const label = fillTemplate(
    t({ en: "Growth {n} of {total}", zh: "成长 {n}/{total}" }),
    { n: filled, total: PIPS },
  );

  return (
    <span role="img" aria-label={label} css={styles.pips}>
      {Array.from({ length: PIPS }, (_, i) => (
        <span key={i} css={[styles.pip, i < filled && styles.pipOn]} />
      ))}
    </span>
  );
}

const styles = stylex.create({
  plate: {
    display: "flex",
    flexDirection: { default: "column", [breakpoints.md]: "row" },
    alignItems: { default: "stretch", [breakpoints.md]: "baseline" },
    gap: { default: rhythm.tight, [breakpoints.md]: rhythm.item },
  },
  head: {
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  level: {
    color: color.fgMuted,
  },
  pips: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
    alignSelf: "center",
  },
  // An empty pip is a ring whose edge is its only sign, so it takes the edge
  // of an unselected control, which holds its contrast on every surface.
  pip: {
    boxSizing: "border-box",
    inlineSize: space._1,
    blockSize: space._1,
    borderRadius: border.radius_round,
    cornerShape: "round",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.borderControl,
  },
  pipOn: {
    borderColor: color.bgSuccess,
    backgroundColor: color.bgSuccess,
  },
});

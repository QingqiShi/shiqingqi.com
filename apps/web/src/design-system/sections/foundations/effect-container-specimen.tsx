"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { EffectContainer } from "@tuja/ui/components/effect-container";
import { Text } from "@tuja/ui/components/text";
import { useEffectContainer } from "@tuja/ui/hooks/use-effect-container";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { t } from "#src/i18n.ts";
import { DustTile, Fan } from "./dust-tile.tsx";

// The page's fan reaches past both cards, so it would pull their dust if the
// cards did not keep it apart.
const PAGE_REACH = 640;
const CARD_REACH = 220;

function Card({ title, dust }: { title: string; dust?: StyleProp }) {
  const container = useEffectContainer();
  return (
    <section
      ref={container}
      data-effect-registered=""
      css={[flex.col, corner.radius_3, styles.card]}
    >
      <EffectContainer value={container}>
        <Text look="bodySmall" weight="semibold">
          {title}
        </Text>
        <div css={[flex.between, styles.cardStage]}>
          <DustTile density={5} css={[styles.tile, dust]} />
          <Fan reach={CARD_REACH} />
        </div>
      </EffectContainer>
    </section>
  );
}

/**
 * Two cards, each an Effect container with dust and an Extractor fan of its
 * own, beside dust and a fan on the page whose reach covers both cards.
 */
export function EffectContainerSpecimen() {
  return (
    <div css={styles.specimen}>
      <Card title={t({ en: "Card A", zh: "卡片 A" })} />
      <div css={[flex.col, styles.page]}>
        <DustTile density={5} css={[styles.tile, styles.info]} />
        <Fan reach={PAGE_REACH} />
      </div>
      <Card title={t({ en: "Card B", zh: "卡片 B" })} dust={styles.success} />
    </div>
  );
}

const styles = stylex.create({
  specimen: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "1fr auto 1fr",
    },
    alignItems: "center",
    gap: space._8,
    paddingBlock: space._5,
  },
  card: {
    gap: space._3,
    padding: space._5,
    color: color.fg,
    backgroundColor: color.bgSurfaceRaised,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  cardStage: {
    gap: space._5,
    minBlockSize: space._12,
  },
  page: {
    alignItems: "center",
    gap: space._7,
  },
  tile: {
    blockSize: space._9,
  },
  info: {
    color: color.fgOnInfo,
    backgroundColor: color.bgInfo,
  },
  success: {
    color: color.fgOnSuccess,
    backgroundColor: color.bgSuccess,
  },
});

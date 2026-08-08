"use client";

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Chip } from "@tuja/ui/components/chip";
import { TextField } from "@tuja/ui/components/text-field";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";

/**
 * The budgets, demonstrated rather than quoted: one label drives a badge, a
 * chip and a button inside a card narrow enough to show what going long costs.
 */
export function CopyBudgetSpecimen() {
  const short = t({ en: "Synced", zh: "已同步" });
  const long = t({
    en: "Successfully synchronised just now",
    zh: "刚刚已成功完成同步",
  });
  const [label, setLabel] = useState(short);

  // An empty control would have no accessible name, which this page argues
  // against three sections earlier.
  const shown = label.trim() || short;

  return (
    <div css={styles.wrap}>
      <div css={[flex.col, styles.controls]}>
        <TextField
          label={t({ en: "Label", zh: "标签文案" })}
          description={t({
            en: "Type one, or start from a length below.",
            zh: "自己输入，或从下面的长度起步。",
          })}
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
        />
        <div css={[flex.wrap, styles.presets]}>
          <Chip
            size="sm"
            isActive={label === short}
            onClick={() => {
              setLabel(short);
            }}
          >
            {short}
          </Chip>
          <Chip
            size="sm"
            isActive={label === long}
            onClick={() => {
              setLabel(long);
            }}
          >
            {long}
          </Chip>
        </div>
      </div>

      <div css={[flex.col, corner.radius_2, styles.card]}>
        <div css={[flex.between, styles.cardHead]}>
          <span css={[styles.cardTitle, truncate.base]}>
            {t({ en: "Recently watched", zh: "最近观看" })}
          </span>
          <Badge variant="success" css={styles.badge}>
            {shown}
          </Badge>
        </div>
        <div css={[flex.wrap, styles.cardRow]}>
          <Chip size="sm" isActive>
            {shown}
          </Chip>
          <Chip size="sm">{t({ en: "Watchlist", zh: "待看清单" })}</Chip>
        </div>
        <div css={[flex.wrap, styles.cardRow]}>
          <Button variant="primary" size="sm">
            {shown}
          </Button>
          <Button variant="outline" size="sm">
            {t({ en: "Cancel", zh: "取消" })}
          </Button>
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // The control and what it drives sit side by side once there is room, so a
  // change to the label and its cost are in view at the same time.
  wrap: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
    gap: space._4,
    alignItems: "start",
  },
  controls: {
    gap: space._2,
    alignItems: "stretch",
    inlineSize: "100%",
    maxInlineSize: "28rem",
  },
  presets: {
    gap: space._1,
  },
  // Narrow on purpose: the budgets are about what a real column can hold.
  // Clipped because Badge and Chip are both nowrap by contract, so a label with
  // no spaces in it would otherwise push the whole page sideways. The card's own
  // padding leaves the focus rings inside more room than they need.
  card: {
    gap: space._3,
    inlineSize: "100%",
    maxInlineSize: "20rem",
    overflow: "clip",
    paddingBlock: space._3,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  cardHead: {
    gap: space._2,
  },
  cardTitle: {
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
    minInlineSize: 0,
  },
  // The badge never wraps, so it takes its space from the title rather than
  // from itself — which is the whole of the budget argument.
  badge: {
    flexShrink: 0,
  },
  cardRow: {
    gap: space._1,
  },
});

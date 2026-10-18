"use client";

import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  font,
  ratio,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";

interface TrailerSheetProps {
  /** The Movie's localized title, set as the card the player would open on. */
  title: string;
  studio: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The trailer dialog behind the hero's primary action.
 *
 * `Sheet` supplies the whole dialog contract — the portal, the scroll lock,
 * the focus trap, Escape, focus restoration, and the close button — so
 * everything this file adds is content: a heading for `aria-labelledby` and the
 * player region.
 *
 * The player holds a typeset title card rather than a video, because the
 * exemplar ships no media and makes no request. It is the poster's logic at
 * `ratio.wide`: a real 16:9 media box at a real elevation, set from the same
 * type scale. A `Spinner` sat here first and was wrong — a loader that never
 * resolves is the one thing on the screen that reads as broken rather than as
 * placeheld, whatever the caption beside it says.
 */
export function TrailerSheet({
  title,
  studio,
  isOpen,
  onClose,
}: TrailerSheetProps) {
  const titleId = useId();

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t({ en: "Close trailer", zh: "关闭预告片" })}
      aria-labelledby={titleId}
    >
      <div css={styles.body}>
        <Heading level={2} look="h2" id={titleId}>
          {t({
            en: "Official trailer",
            zh: "官方预告片",
          })}
        </Heading>
        <div css={[corner.radius_3, styles.player]}>
          <Text as="span" look="overline" tone="muted" transform="uppercase">
            {studio}
          </Text>
          <span css={[typeRole.subDisplay, styles.cardTitle]}>{title}</span>
          <Text look="bodySmall" tone="muted" align="center">
            {t({
              en: "No video ships with the exemplar. The player holds the title card instead.",
              zh: "本示例不附带视频，播放区域改为呈现标题卡。",
            })}
          </Text>
        </div>
      </div>
    </Sheet>
  );
}

const styles = stylex.create({
  body: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
  },
  player: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.tight,
    aspectRatio: ratio.wide,
    padding: space._4,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurfaceSunken,
  },
  cardTitle: {
    color: color.fg,
    lineHeight: font.lineHeight_00,
    textAlign: "center",
  },
});

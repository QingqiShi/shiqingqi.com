"use client";

import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Overlay } from "@tuja/ui/components/overlay";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, ratio, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";

interface TrailerOverlayProps {
  /** The Movie's localized title, set as the card the player would open on. */
  title: string;
  studio: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The trailer dialog behind the hero's primary action.
 *
 * `Overlay` supplies the whole dialog contract — the portal, the scroll lock,
 * the focus trap, Escape, focus restoration, and the close `IconButton` — so
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
export function TrailerOverlay({
  title,
  studio,
  isOpen,
  onClose,
}: TrailerOverlayProps) {
  const titleId = useId();

  return (
    <Overlay
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t({ en: "Close trailer", zh: "关闭预告片" })}
      aria-labelledby={titleId}
    >
      <div css={styles.body}>
        <Heading level={2} variant="h2" id={titleId}>
          {t({
            en: "Official trailer",
            zh: "官方预告片",
          })}
        </Heading>
        <div css={[corner.radius_2, styles.player]}>
          <Text
            as="span"
            variant="overline"
            tone="subtle"
            transform="uppercase"
          >
            {studio}
          </Text>
          <span css={styles.cardTitle}>{title}</span>
          <Text variant="bodySmall" tone="subtle" align="center">
            {t({
              en: "No video ships with the exemplar. The player holds the title card instead.",
              zh: "本示例不附带视频，播放区域改为呈现标题卡。",
            })}
          </Text>
        </div>
      </div>
    </Overlay>
  );
}

const styles = stylex.create({
  // Centred in the dialog rather than parked at its top. The Overlay is
  // full-screen and the player is one 16:9 box, so top-aligning it left half a
  // viewport of nothing under the only thing in the room.
  body: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: space._4,
    inlineSize: "100%",
    maxInlineSize: "48rem",
    minBlockSize: "100%",
    marginInline: "auto",
    paddingInline: space._3,
    paddingBlock: space._7,
  },
  player: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space._2,
    aspectRatio: ratio.wide,
    padding: space._4,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  // The one local type step, for the same reason the poster's title is local:
  // `weight_8` is a step past what `Text` exposes.
  cardTitle: {
    color: color.textMain,
    fontSize: font.uiSubDisplay,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_00,
    textAlign: "center",
    textWrap: "balance",
  },
});

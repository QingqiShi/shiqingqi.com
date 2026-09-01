"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { useDisclosure } from "@tuja/ui/hooks/use-disclosure";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import type { StyleProp } from "@tuja/ui/style-prop";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";

interface SpecimenRevealProps {
  /** What the specimen shows. Already localised. */
  caption: string;
  /** The drawn source. Pass `null` to leave the control out. */
  code: ReactNode;
  /** StyleX overrides for the cell, merged last. */
  css?: StyleProp;
  /** The instance itself. */
  children: ReactNode;
}

/**
 * The specimen cell, and the panel that opens under it. The two are siblings,
 * so in a `SpecimenGrid` the panel spans every track instead of squeezing into
 * one 220px cell. This is the only part of a specimen that runs in the browser
 * — the code arrives already drawn.
 */
export function SpecimenReveal({
  caption,
  code,
  css,
  children,
}: SpecimenRevealProps) {
  const { open, triggerProps, panelProps } = useDisclosure();

  return (
    <>
      <div css={[flex.col, styles.cell, css]}>
        <div css={styles.stage}>{children}</div>
        <div css={styles.row}>
          <Text as="span" variant="caption" tone="subtle" css={styles.caption}>
            {caption}
          </Text>
          {code ? (
            <button
              {...triggerProps}
              css={[
                buttonReset.base,
                a11y.focusRing,
                transition.colors,
                corner.radius_1,
                styles.control,
              ]}
            >
              {/* `aria-expanded` reports the state, so the name holds still. */}
              {t({ en: "Code", zh: "代码" })}
              <span
                aria-hidden
                css={[
                  styles.caret,
                  transition.transform,
                  open && styles.caretUp,
                ]}
              >
                <CaretDownIcon weight="bold" />
              </span>
            </button>
          ) : null}
        </div>
      </div>
      {/* No `display` here: the panel collapses through the `hidden` attribute,
          which any `display` declaration would override. */}
      {code ? (
        <div {...panelProps} css={[corner.radius_2, styles.panel]}>
          {code}
        </div>
      ) : null}
    </>
  );
}

const styles = stylex.create({
  cell: {
    gap: space._2,
    minInlineSize: 0,
  },
  // A block, not a flex row. A flex row makes every child shrink to its own
  // content, which is right for a button and wrong for a card, a divider or a
  // page shell — those used to fill the showcase column and would otherwise
  // need `inlineSize: 100%` bolted on at each callsite, putting doc scaffolding
  // into the source a reader copies. As a block, a block-level specimen fills
  // and an inline-flex control keeps its own width.
  stage: {
    display: "block",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    minInlineSize: 0,
  },
  // Size and tone come from `Text`; this only lets a long caption shrink
  // rather than push the control out of the row.
  caption: {
    minInlineSize: 0,
  },
  // Always visible, never hover-only: a touch or keyboard visitor gets no
  // hover to reveal it with.
  control: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._0,
    flexShrink: 0,
    paddingInline: space._1,
    paddingBlock: space._00,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: { default: color.textSubtle, ":hover": color.textMain },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
  },
  caret: {
    display: "inline-flex",
    color: color.textSubtle,
  },
  caretUp: {
    transform: "rotate(180deg)",
  },
  // Spans every track of a `SpecimenGrid`, so the snippet reads at the full
  // width of the row rather than inside one 220px cell. The declaration is
  // inert outside a grid, where the panel simply stacks under the cell.
  panel: {
    gridColumn: "1 / -1",
    paddingBlock: space._2,
    paddingInline: space._2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
});

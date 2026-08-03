"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Chip } from "@tuja/ui/components/chip";
import { Text } from "@tuja/ui/components/text";
import { useDisclosure } from "@tuja/ui/hooks/use-disclosure";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

/**
 * The case the component can't cover: the header holds a link, so it cannot
 * itself be a `<button>` — nesting one control inside another is invalid, and a
 * screen reader would announce the row as a single confused control.
 *
 * `useDisclosure` supplies the same ARIA wiring to a separate toggle beside the
 * link. Its own `"use client"` island so the surrounding showcase stays a server
 * component.
 */
export function DisclosureHeadlessSpecimen() {
  const { open, triggerProps, panelProps } = useDisclosure();

  return (
    <div css={[cardSurface.base, fill.inline]}>
      <div css={styles.header}>
        <a href="#disclosure" css={styles.link}>
          {t({ en: "Florence → Siena", zh: "佛罗伦萨 → 锡耶纳" })}
        </a>
        <Chip
          size="sm"
          {...triggerProps}
          trailing={
            <span
              aria-hidden
              css={[
                transition.transform,
                styles.caret,
                open && styles.caretOpen,
              ]}
            >
              <CaretDownIcon weight="bold" />
            </span>
          }
        >
          {t({ en: "Map", zh: "地图" })}
        </Chip>
      </div>
      <div {...panelProps} css={styles.panel}>
        <Text variant="bodySmall" tone="muted">
          {t({
            en: "The panel stays mounted and flips hidden, so aria-controls always resolves.",
            zh: "面板始终挂载并切换 hidden，因此 aria-controls 始终能解析到元素。",
          })}
        </Text>
      </div>
    </div>
  );
}

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  link: {
    color: { default: color.textMain, ":hover": color.textMuted },
    textUnderlineOffset: "0.25em",
  },
  caret: {
    display: "inline-flex",
  },
  caretOpen: {
    transform: "rotate(180deg)",
  },
  panel: {
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
});

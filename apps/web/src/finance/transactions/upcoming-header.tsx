"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { formatMoney } from "../domain/money/format-money.ts";

interface UpcomingHeaderProps {
  count: number;
  /** In `currency`. Negative for money out. */
  totalMinor: number;
  open: boolean;
  currency: string;
  locale: string;
  onToggle: () => void;
}

export function UpcomingHeader({
  count,
  totalMinor,
  open,
  currency,
  locale,
  onToggle,
}: UpcomingHeaderProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      css={[
        buttonReset.base,
        flex.between,
        corner.radius_3,
        plainList.row,
        styles.upcoming,
      ]}
    >
      <span css={[flex.row, typeRole.label, styles.label]}>
        {open ? (
          <CaretDownIcon weight="bold" aria-hidden />
        ) : (
          <CaretRightIcon weight="bold" aria-hidden />
        )}
        {`${t({ en: "Coming up", zh: "即将到期" })} (${String(count)})`}
      </span>
      {totalMinor !== 0 ? (
        <span css={[typeRole.caption, typeModifier.numeric, styles.total]}>
          {formatMoney(totalMinor, currency, locale, {
            signDisplay: "exceptZero",
          })}
        </span>
      ) : null}
    </button>
  );
}

const styles = stylex.create({
  upcoming: {
    inlineSize: "100%",
    gap: rhythm.tight,
    paddingBlock: space._2,
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
  label: {
    gap: rhythm.inline,
    fontWeight: font.weight_6,
  },
  total: {
    color: color.fgMuted,
  },
});

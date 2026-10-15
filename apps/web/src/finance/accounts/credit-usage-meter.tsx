"use client";

import * as stylex from "@stylexjs/stylex";
import { Progress } from "@tuja/ui/components/progress";
import { progressTokens } from "@tuja/ui/components/progress.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { formatMoney } from "../domain/money/format-money.ts";

interface CreditUsageMeterProps {
  /** Negative when money is owed on the card. */
  balanceMinor: number;
  limitMinor: number;
  currency: string;
}

export function CreditUsageMeter({
  balanceMinor,
  limitMinor,
  currency,
}: CreditUsageMeterProps) {
  const locale = useLocale();
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const used = Math.max(0, -balanceMinor);
  const usedText = `${t({ en: "Used", zh: "已用" })} ${money(used)}`;
  const limitText = `${t({ en: "Limit", zh: "额度" })} ${money(limitMinor)}`;
  const availableText = `${t({ en: "Available", zh: "可用" })} ${money(limitMinor + balanceMinor)}`;

  return (
    <div css={[flex.col, styles.root]}>
      <Progress
        value={used}
        max={limitMinor}
        size="sm"
        label={t({ en: "Credit limit used", zh: "信用额度使用" })}
        aria-valuetext={`${usedText} / ${limitText}`}
        css={styles.meter}
      />
      <div
        css={[
          flex.between,
          typeRole.caption,
          typeModifier.numeric,
          styles.caption,
        ]}
      >
        <span>{`${usedText} / ${limitText}`}</span>
        <span css={styles.available}>{availableText}</span>
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    gap: rhythm.tight,
  },
  meter: {
    [progressTokens.indicatorColor]: color.fg,
  },
  caption: {
    gap: rhythm.tight,
    flexWrap: "wrap",
    color: color.fgMuted,
  },
  available: {
    color: color.fg,
  },
});

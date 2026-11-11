"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Progress } from "@tuja/ui/components/progress";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
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
      />
      <div css={[flex.between, styles.caption]}>
        <Text as="span" look="caption" tone="muted" numeric>
          {`${usedText} / ${limitText}`}
        </Text>
        <Text as="span" look="caption" numeric>
          {availableText}
        </Text>
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    gap: rhythm.tight,
  },
  caption: {
    gap: rhythm.tight,
    flexWrap: "wrap",
  },
});

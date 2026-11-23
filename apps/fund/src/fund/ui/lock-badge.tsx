"use client";

import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { LockSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr/LockSimpleOpen";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Badge } from "@tuja/ui/components/badge";
import { displayDate } from "./display-date.ts";

/** Whether a position's shares may be sold yet, under the 30-day hold. */
export function LockBadge({
  quantity,
  unlockedQuantity,
  nextUnlockOn,
  lastUnlockOn,
}: {
  quantity: number;
  unlockedQuantity: number;
  nextUnlockOn: string | null;
  lastUnlockOn: string | null;
}) {
  const locale = useLocale();
  if (unlockedQuantity >= quantity || nextUnlockOn === null) {
    return (
      <Badge
        size="sm"
        intent="success"
        icon={<LockSimpleOpenIcon weight="bold" />}
      >
        {t({ en: "Can be sold", zh: "可卖出" })}
      </Badge>
    );
  }
  if (unlockedQuantity === 0) {
    return (
      <Badge size="sm" intent="neutral" icon={<LockSimpleIcon weight="bold" />}>
        {t({ en: "Locked until {date}", zh: "锁定至 {date}" }).replace(
          "{date}",
          displayDate(lastUnlockOn ?? nextUnlockOn, locale),
        )}
      </Badge>
    );
  }
  return (
    <Badge size="sm" intent="neutral" icon={<LockSimpleIcon weight="bold" />}>
      {t({
        en: "{n} can be sold, more from {date}",
        zh: "{n} 股可卖，其余 {date} 起",
      })
        .replace("{n}", unlockedQuantity.toLocaleString("en-GB"))
        .replace("{date}", displayDate(nextUnlockOn, locale))}
    </Badge>
  );
}

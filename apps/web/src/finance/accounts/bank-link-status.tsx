"use client";

import { LinkSimpleIcon } from "@phosphor-icons/react/dist/ssr/LinkSimple";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { useBankErrorMessage } from "../settings/use-bank-error-message.ts";
import type { BankLinkRow } from "../sync/row-schemas.ts";

export function BankLinkStatus({ link }: { link: BankLinkRow }) {
  const locale = useLocale();
  const bankErrorMessage = useBankErrorMessage();
  const needsReconnect = link.status !== "active";
  const reason =
    bankErrorMessage(link.lastError) ??
    (needsReconnect ? bankErrorMessage("reconnect") : null);
  const synced =
    link.lastSyncAt === null
      ? t({ en: "Not synced yet", zh: "尚未同步" })
      : `${t({ en: "Synced", zh: "同步于" })} ${displayDay(link.lastSyncAt.slice(0, 10), locale, "day")}`;

  return (
    <div css={[flex.col, styles.root]}>
      <p css={[cluster.tight, typeRole.bodySmall, styles.line]}>
        <span css={[cluster.inline, styles.muted]}>
          <LinkSimpleIcon weight="bold" aria-hidden />
          <span>
            {[link.providerName || link.providerInstitution, synced]
              .filter((part) => part !== "")
              .join(" · ")}
          </span>
        </span>
        {needsReconnect ? (
          <Badge size="sm" intent="warning">
            {t({ en: "Reconnect", zh: "需重新连接" })}
          </Badge>
        ) : null}
      </p>
      {reason === null ? null : (
        <p css={[typeRole.bodySmall, styles.line, styles.muted]}>{reason}</p>
      )}
    </div>
  );
}

const styles = stylex.create({
  root: {
    gap: rhythm.inline,
  },
  line: {
    margin: 0,
  },
  muted: {
    color: color.fgMuted,
  },
});

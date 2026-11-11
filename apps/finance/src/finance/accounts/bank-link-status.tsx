"use client";

import { LinkSimpleIcon } from "@phosphor-icons/react/dist/ssr/LinkSimple";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Badge } from "@tuja/ui/components/badge";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
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
        <Text as="span" look="bodySmall" tone="muted" css={cluster.inline}>
          <LinkSimpleIcon weight="bold" aria-hidden />
          <MetaLine
            facts={[link.providerName || link.providerInstitution, synced]}
          />
        </Text>
        {needsReconnect ? (
          <Badge size="sm" intent="warning">
            {t({ en: "Reconnect", zh: "需重新连接" })}
          </Badge>
        ) : null}
      </p>
      {reason === null ? null : (
        <Text look="bodySmall" tone="muted" measure="none">
          {reason}
        </Text>
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
});

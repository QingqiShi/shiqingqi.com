"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Callout } from "@tuja/ui/components/callout";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { Select } from "@tuja/ui/components/select";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, space } from "@tuja/ui/tokens.stylex";
import { accountFullName } from "../accounts/account-full-name.ts";
import type { ProviderAccountView } from "../bank/types.ts";
import { isLinkableAccount } from "../domain/accounts/is-linkable-account.ts";
import { displayMoment } from "../domain/dates/display-moment.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { choiceOf, type BankLinkChoice } from "./plan-bank-link-changes.ts";
import { useBankErrorMessage } from "./use-bank-error-message.ts";

interface ProviderAccountCardProps {
  account: ProviderAccountView;
  accounts: readonly AccountRow[];
  /** Member id → name. */
  memberNames: ReadonlyMap<string, string>;
  editable: boolean;
  choice: BankLinkChoice;
  /** Finance account id → the provider account that has it picked. */
  takenBy: ReadonlyMap<string, string>;
  onChange: (choice: BankLinkChoice) => void;
}

export function ProviderAccountCard({
  account,
  accounts,
  memberNames,
  editable,
  choice,
  takenBy,
  onChange,
}: ProviderAccountCardProps) {
  const locale = useLocale();
  const bankLinks = useReplica(liveRowSelectors.bankLinks);
  const replicaLink = account.link
    ? bankLinks.find((link) => link.id === account.link?.id)
    : undefined;
  const lastSyncAt =
    replicaLink?.lastSyncAt ?? account.link?.lastSyncAt ?? null;
  const lastError = replicaLink?.lastError ?? account.link?.lastError ?? null;
  const bankErrorMessage = useBankErrorMessage();
  const linkable = accounts.filter(
    (finance) =>
      isLinkableAccount(finance) &&
      finance.closedOn === null &&
      (account.currency === null || finance.currency === account.currency),
  );
  const fullName = (finance: AccountRow) =>
    accountFullName(
      finance,
      finance.ownerMemberId === null
        ? null
        : (memberNames.get(finance.ownerMemberId) ?? null),
    );
  const linked = accounts.find(
    (finance) => finance.id === account.link?.accountId,
  );
  const linkedName = linked ? fullName(linked) : null;

  return (
    <FlowBlock as="li" surface css={[corner.radius_3, stack.item, styles.card]}>
      <div css={[row.tight, styles.head]}>
        <div css={[row.tight, styles.identity]}>
          <Avatar
            name={account.institution}
            src={account.institutionLogo ?? undefined}
            shape="square"
            aria-hidden
          />
          <div css={styles.names}>
            <span css={[typeRole.body, styles.name]}>{account.name}</span>
            {account.currency === null ? null : (
              <span css={[typeRole.caption, styles.muted]}>
                {account.currency}
              </span>
            )}
          </div>
        </div>
        {account.needsReconnect || replicaLink?.status === "reconnect" ? (
          <Badge size="sm" intent="warning">
            {t({
              en: "Reconnect in Lunch Flow",
              zh: "需在 Lunch Flow 重新连接",
            })}
          </Badge>
        ) : account.link ? (
          <Badge size="sm" intent="success">
            {t({ en: "Linked", zh: "已关联" })}
          </Badge>
        ) : null}
      </div>
      {editable ? (
        <Select
          size="sm"
          label={t({ en: "Feeds this account", zh: "关联到账户" })}
          value={choice.accountId}
          options={[
            { value: "", label: t({ en: "Not linked", zh: "不关联" }) },
            ...linkable.map((finance) => ({
              value: finance.id,
              label: fullName(finance),
              disabled:
                (takenBy.get(finance.id) ?? account.providerAccountId) !==
                account.providerAccountId,
            })),
          ]}
          onChange={(event) => {
            onChange({ ...choice, accountId: event.target.value });
          }}
        />
      ) : (
        <Text look="bodySmall">
          {linkedName === null
            ? t({ en: "Not linked", zh: "未关联" })
            : `${t({ en: "Feeds", zh: "关联到" })} ${linkedName}`}
        </Text>
      )}
      {account.link ? (
        <Text look="caption" tone="muted">
          {lastSyncAt === null
            ? t({ en: "Not synced yet", zh: "尚未同步" })
            : `${t({ en: "Last synced", zh: "上次同步" })} ${displayMoment(lastSyncAt, locale)}`}
        </Text>
      ) : null}
      {lastError ? (
        <Callout intent="warning">{bankErrorMessage(lastError)}</Callout>
      ) : null}
      {account.link && editable ? (
        <Disclosure
          look="inline"
          summary={t({ en: "More", zh: "更多" })}
          defaultOpen={choiceOf(account).flipped}
        >
          <Switch
            label={t({
              en: "Spending arrives as a positive amount",
              zh: "银行把支出显示为正数",
            })}
            description={t({
              en: "Turn on only if this account's purchases arrive as money in. Most banks and cards show purchases as negative.",
              zh: "仅当此账户的消费显示为入账时才打开。大多数银行和信用卡把消费显示为负数。",
            })}
            value={choice.flipped ? "on" : "off"}
            onChange={(state) => {
              onChange({ ...choice, flipped: state === "on" });
            }}
          />
        </Disclosure>
      ) : null}
    </FlowBlock>
  );
}

const styles = stylex.create({
  card: {
    padding: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  head: {
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  identity: {
    minInlineSize: 0,
  },
  names: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  name: {
    fontWeight: font.weight_6,
  },
  muted: {
    color: color.fgMuted,
  },
});

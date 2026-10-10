"use client";

import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Heading } from "@tuja/ui/components/heading";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useId, useRef, useState, type SubmitEvent } from "react";
import { t } from "#src/i18n.ts";
import {
  sideOfKind,
  type AccountKind,
} from "../domain/accounts/side-of-kind.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { nextPosition } from "../settings/next-position.ts";
import { PaneSheet } from "../shell/pane-sheet.tsx";
import { useToast } from "../shell/toast-provider.tsx";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { currencyOptions } from "./currency-options.ts";
import { selectAccountCurrencies } from "./select-account-currencies.ts";
import { selectAccountInUse } from "./select-account-in-use.ts";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";
import { valuationInputSign } from "./valuation-input-sign.ts";

const KINDS: readonly AccountKind[] = [
  "cash",
  "credit",
  "investment",
  "property",
  "loan",
  "receivable",
];

interface AccountEditorSheetProps {
  /** The account to edit, or null to create one. */
  account: AccountRow | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after the account is deleted, so its screen can leave. */
  onDeleted?: () => void;
}

/** Edits an account's name, Group, owner, kind, currency, credit details and flags; or creates one. */
export function AccountEditorSheet({
  account,
  isOpen,
  onClose,
  onDeleted,
}: AccountEditorSheetProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  return (
    <PaneSheet
      isOpen={isOpen}
      onClose={onClose}
      label={
        account
          ? t({ en: "Edit account", zh: "编辑账户" })
          : t({ en: "New account", zh: "新建账户" })
      }
      initialFocusRef={nameRef}
    >
      {isOpen ? (
        <AccountEditorForm
          account={account}
          nameRef={nameRef}
          onDone={onClose}
          onDeleted={onDeleted}
        />
      ) : null}
    </PaneSheet>
  );
}

interface AccountEditorFormProps {
  account: AccountRow | null;
  nameRef: React.RefObject<HTMLInputElement | null>;
  onDone: () => void;
  onDeleted?: () => void;
}

function dayText(value: number | null) {
  return value === null ? "" : String(value);
}

function AccountEditorForm({
  account,
  nameRef,
  onDone,
  onDeleted,
}: AccountEditorFormProps) {
  const store = useReplicaStore();
  const showToast = useToast();
  const runUndoable = useUndoableMutations();
  const today = useHouseholdToday();
  const headingId = useId();
  const deleteHintId = useId();
  const groups = useReplica(liveRowSelectors.accountGroups);
  const members = useReplica(liveRowSelectors.members);
  const removedOwner = useReplica((snapshot) => {
    const owner = account?.ownerMemberId
      ? snapshot.tables.members.get(account.ownerMemberId)
      : undefined;
    return owner?.deletedAt ? owner : undefined;
  });
  const accounts = useReplica(liveRowSelectors.accounts);
  const baseCurrency = useBaseCurrency();
  const inUse = useReplica((snapshot) =>
    account ? selectAccountInUse(snapshot, account.id) : false,
  );
  const usedCurrencies = useReplica(selectAccountCurrencies);
  const hasHistory = useReplica((snapshot) => {
    if (!account) return false;
    for (const entry of snapshot.tables.entries.values()) {
      if (entry.accountId === account.id && entry.deletedAt === null)
        return true;
    }
    for (const valuation of snapshot.tables.valuations.values()) {
      if (valuation.accountId === account.id && valuation.deletedAt === null)
        return true;
    }
    return false;
  });

  const [name, setName] = useState(account?.name ?? "");
  const [institution, setInstitution] = useState(account?.institution ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "cash");
  const [groupId, setGroupId] = useState(account?.groupId ?? "");
  const [ownerId, setOwnerId] = useState(account?.ownerMemberId ?? "");
  const [currency, setCurrency] = useState(account?.currency ?? baseCurrency);
  const [creditLimit, setCreditLimit] = useState(() =>
    account?.creditLimitMinor == null
      ? ""
      : minorUnitsToDecimalString(account.creditLimitMinor, account.currency),
  );
  const [statementDay, setStatementDay] = useState(() =>
    dayText(account?.statementDay ?? null),
  );
  const [dueDay, setDueDay] = useState(() =>
    dayText(account?.paymentDueDay ?? null),
  );
  const [excluded, setExcluded] = useState(
    account?.excludedFromNetWorth ?? false,
  );
  const [closed, setClosed] = useState(account?.closedOn != null);
  const [closedOn, setClosedOn] = useState(account?.closedOn ?? today);
  const [opening, setOpening] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState(
    account?.defaultPaymentAccountId ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const side = sideOfKind(kind);
  const groupOptions = groups.filter((group) => group.side === side);
  const resolvedGroupId = groupOptions.some((group) => group.id === groupId)
    ? groupId
    : (groupOptions[0]?.id ?? "");

  const kindLabels: Record<AccountKind, string> = {
    cash: t({ en: "Cash (current or savings)", zh: "现金（活期或储蓄）" }),
    credit: t({ en: "Credit card", zh: "信用卡" }),
    investment: t({ en: "Investment", zh: "投资" }),
    property: t({ en: "Property", zh: "房产" }),
    loan: t({ en: "Loan", zh: "贷款" }),
    receivable: t({ en: "Money owed to you", zh: "应收款" }),
  };
  const messages = {
    name: t({ en: "Give the account a name", zh: "请填写账户名称" }),
    group: t({
      en: "Create a group for this side of the balance sheet first",
      zh: "请先在资产负债表的这一侧创建分组",
    }),
    currency: t({
      en: "Use a three-letter code, such as GBP",
      zh: "请填写三位字母的币种代码，例如 GBP",
    }),
    amount: t({ en: "Enter an amount", zh: "请输入金额" }),
    day: t({ en: "Enter a day from 1 to 31", zh: "请输入 1 到 31 之间的日期" }),
    failed: t({
      en: "The account did not save. Try again.",
      zh: "账户未能保存，请重试。",
    }),
    saved: t({ en: "Account saved", zh: "账户已保存" }),
    deleted: t({ en: "Account deleted", zh: "账户已删除" }),
    deleteFailed: t({
      en: "The account still has history, so it was not deleted. Close it instead.",
      zh: "该账户仍有历史记录，无法删除。请改为关闭。",
    }),
  };

  function readDay(text: string, key: string, found: Record<string, string>) {
    if (text.trim() === "") return null;
    const value = Number(text);
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      found[key] = messages.day;
      return null;
    }
    return value;
  }

  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Record<string, string> = {};
    const code = currency.trim().toUpperCase();
    if (name.trim() === "") found.name = messages.name;
    if (resolvedGroupId === "") found.group = messages.group;
    if (!/^[A-Z]{3}$/.test(code)) found.currency = messages.currency;
    const isCredit = kind === "credit";
    const limit =
      isCredit && creditLimit.trim() !== ""
        ? parseMoney(creditLimit, code)
        : null;
    if (isCredit && creditLimit.trim() !== "" && limit === null) {
      found.creditLimit = messages.amount;
    }
    const statement = isCredit
      ? readDay(statementDay, "statementDay", found)
      : null;
    const due = isCredit ? readDay(dueDay, "dueDay", found) : null;
    const openingMinor =
      opening.trim() === "" ? null : parseMoney(opening, code);
    if (opening.trim() !== "" && openingMinor === null)
      found.opening = messages.amount;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const fields = {
      name: name.trim(),
      institution: institution.trim(),
      kind,
      groupId: resolvedGroupId,
      ownerMemberId: ownerId === "" ? null : ownerId,
      currency: code,
      creditLimitMinor: limit === null ? null : Math.abs(limit),
      statementDay: statement,
      paymentDueDay: due,
      defaultPaymentAccountId:
        isCredit && paymentAccountId !== "" ? paymentAccountId : null,
      excludedFromNetWorth: excluded,
      closedOn: closed ? closedOn : null,
    };
    try {
      if (account) {
        store.applyLocal({
          name: "upsertAccount",
          args: { id: account.id, ...fields },
        });
      } else {
        const id = crypto.randomUUID();
        const position = nextPosition(
          accounts.filter((other) => other.groupId === resolvedGroupId),
        );
        store.applyLocal({
          name: "upsertAccount",
          args: { id, ...fields, position },
        });
        if (openingMinor !== null && openingMinor !== 0) {
          store.applyLocal({
            name: "putValuation",
            args: {
              id: crypto.randomUUID(),
              accountId: id,
              on: today,
              amountMinor: openingMinor * valuationInputSign(kind),
            },
          });
        }
      }
    } catch {
      showToast({ message: messages.failed });
      return;
    }
    showToast({ message: messages.saved, durationMs: 4000 });
    onDone();
  }

  function remove() {
    if (!account) return;
    try {
      runUndoable(
        [{ name: "upsertAccount", args: { id: account.id, deleted: true } }],
        { message: messages.deleted },
      );
    } catch {
      showToast({ message: messages.deleteFailed });
      return;
    }
    onDone();
    onDeleted?.();
  }

  const paymentOptions = accounts.filter(
    (other) =>
      other.kind === "cash" &&
      other.id !== account?.id &&
      other.closedOn === null,
  );

  return (
    <form
      aria-labelledby={headingId}
      onSubmit={save}
      noValidate
      css={[stack.group, styles.form]}
    >
      <Heading id={headingId} level={2} look="h3">
        {account
          ? t({ en: "Edit account", zh: "编辑账户" })
          : t({ en: "New account", zh: "新建账户" })}
      </Heading>
      <div css={stack.item}>
        <TextField
          ref={nameRef}
          label={t({ en: "Name", zh: "名称" })}
          value={name}
          error={errors.name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <TextField
          label={t({ en: "Institution", zh: "机构" })}
          description={t({
            en: "The bank or provider, which tells apart accounts with the same name.",
            zh: "银行或机构名称，用于区分同名账户。",
          })}
          value={institution}
          onChange={(event) => {
            setInstitution(event.target.value);
          }}
        />
        <Select
          label={t({ en: "Kind", zh: "类型" })}
          value={kind}
          options={KINDS.map((value) => ({ value, label: kindLabels[value] }))}
          onChange={(event) => {
            const next = KINDS.find((value) => value === event.target.value);
            if (next) setKind(next);
          }}
        />
        <Select
          label={t({ en: "Group", zh: "分组" })}
          description={
            side === "asset"
              ? t({ en: "Asset groups", zh: "资产分组" })
              : t({ en: "Liability groups", zh: "负债分组" })
          }
          error={errors.group}
          value={resolvedGroupId}
          options={groupOptions.map((group) => ({
            value: group.id,
            label: group.name,
          }))}
          onChange={(event) => {
            setGroupId(event.target.value);
          }}
        />
        <Select
          label={t({ en: "Owner", zh: "归属" })}
          value={ownerId}
          options={[
            { value: "", label: t({ en: "Shared", zh: "共同" }) },
            ...[...members, ...(removedOwner ? [removedOwner] : [])].map(
              (member) => ({ value: member.id, label: member.name }),
            ),
          ]}
          onChange={(event) => {
            setOwnerId(event.target.value);
          }}
        />
        <Select
          label={t({ en: "Currency", zh: "币种" })}
          description={
            hasHistory
              ? t({
                  en: "Fixed once the account has entries or balances.",
                  zh: "账户已有记录后不能更改币种。",
                })
              : undefined
          }
          error={errors.currency}
          value={currency}
          disabled={hasHistory}
          options={currencyOptions(baseCurrency, usedCurrencies, currency).map(
            (code) => ({ value: code, label: code }),
          )}
          onChange={(event) => {
            setCurrency(event.target.value);
          }}
        />
      </div>
      {kind === "credit" ? (
        <fieldset css={[stack.item, styles.fieldset]}>
          <Text as="span" look="label" weight="semibold">
            {t({ en: "Credit card", zh: "信用卡" })}
          </Text>
          <TextField
            label={t({ en: "Credit limit", zh: "信用额度" })}
            inputMode="decimal"
            value={creditLimit}
            error={errors.creditLimit}
            onChange={(event) => {
              setCreditLimit(event.target.value);
            }}
          />
          <div css={[cluster.item, styles.pair]}>
            <TextField
              label={t({ en: "Statement day", zh: "账单日" })}
              inputMode="numeric"
              value={statementDay}
              error={errors.statementDay}
              onChange={(event) => {
                setStatementDay(event.target.value);
              }}
            />
            <TextField
              label={t({ en: "Payment due day", zh: "还款日" })}
              inputMode="numeric"
              value={dueDay}
              error={errors.dueDay}
              onChange={(event) => {
                setDueDay(event.target.value);
              }}
            />
          </div>
          <Select
            label={t({ en: "Paid from", zh: "还款账户" })}
            description={t({
              en: "The account a repayment comes from by default.",
              zh: "默认用来还款的账户。",
            })}
            value={paymentAccountId}
            options={[
              { value: "", label: t({ en: "Not set", zh: "未设置" }) },
              ...paymentOptions.map((other) => ({
                value: other.id,
                label: other.institution
                  ? `${other.name} · ${other.institution}`
                  : other.name,
              })),
            ]}
            onChange={(event) => {
              setPaymentAccountId(event.target.value);
            }}
          />
        </fieldset>
      ) : null}
      {account ? null : (
        <TextField
          label={
            side === "liability"
              ? t({ en: "Amount owed today", zh: "今日欠款" })
              : t({ en: "Balance today", zh: "今日余额" })
          }
          description={t({
            en: "Leave empty to start at zero.",
            zh: "留空则从零开始。",
          })}
          inputMode="decimal"
          value={opening}
          error={errors.opening}
          onChange={(event) => {
            setOpening(event.target.value);
          }}
        />
      )}
      <div css={stack.item}>
        <Checkbox
          label={t({ en: "Leave out of net worth", zh: "不计入净资产" })}
          description={t({
            en: "For an account you track but do not own, such as an instalment plan.",
            zh: "适用于只需跟踪、并不属于你的账户，例如分期计划。",
          })}
          checked={excluded}
          onChange={(event) => {
            setExcluded(event.target.checked);
          }}
        />
        {account ? (
          <Checkbox
            label={t({ en: "Closed", zh: "已关闭" })}
            description={t({
              en: "History before the closing day still counts. From that day the balance is zero.",
              zh: "关闭日之前的记录仍然计入；从关闭日起余额为零。",
            })}
            checked={closed}
            onChange={(event) => {
              setClosed(event.target.checked);
            }}
          />
        ) : null}
        {account && closed ? (
          <TextField
            type="date"
            label={t({ en: "Closed on", zh: "关闭日期" })}
            value={closedOn}
            onChange={(event) => {
              if (event.target.value) setClosedOn(event.target.value);
            }}
          />
        ) : null}
      </div>
      <div css={cluster.tight}>
        <Button type="submit" look="primary">
          {t({ en: "Save", zh: "保存" })}
        </Button>
        <Button look="ghost" onClick={onDone}>
          {t({ en: "Cancel", zh: "取消" })}
        </Button>
      </div>
      {account ? (
        <div css={[stack.tight, styles.danger]}>
          <div>
            <Button
              look="danger"
              size="sm"
              icon={<TrashIcon weight="bold" />}
              disabled={inUse}
              aria-describedby={inUse ? deleteHintId : undefined}
              onClick={remove}
            >
              {t({ en: "Delete account", zh: "删除账户" })}
            </Button>
          </div>
          {inUse ? (
            <Text id={deleteHintId} look="caption" tone="muted">
              {t({
                en: "It has transactions, balances or a bank link. Close it instead to keep its history.",
                zh: "该账户已有交易、余额记录或银行关联。如需保留历史，请改为关闭。",
              })}
            </Text>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: "32rem",
    marginInline: "auto",
  },
  fieldset: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    minInlineSize: 0,
  },
  danger: {
    paddingBlockStart: space._4,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  pair: {
    alignItems: "flex-start",
    rowGap: rhythm.item,
  },
});

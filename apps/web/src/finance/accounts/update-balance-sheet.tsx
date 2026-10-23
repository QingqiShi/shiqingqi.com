"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { useToast } from "@tuja/ui/components/toast-provider";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { measure } from "@tuja/ui/tokens.stylex";
import { useId, useRef, useState, type SubmitEvent } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { sideOfKind } from "../domain/accounts/side-of-kind.ts";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { formatPercentChange } from "../domain/money/format-percent-change.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { PaneSheet } from "../shell/pane-sheet.tsx";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import type { AccountRow, BankLinkRow } from "../sync/row-schemas.ts";
import { accountDetailLine } from "./account-detail-line.ts";
import { buildValuationMutations } from "./build-valuation-mutations.ts";
import { currencySymbol } from "./currency-symbol.ts";
import { DayChips } from "./day-chips.tsx";
import {
  valuationInputSign,
  valuationInputText,
} from "./valuation-input-sign.ts";

interface UpdateTarget {
  account: AccountRow;
  ownerName: string | null;
  bankLink: BankLinkRow | null;
}

interface UpdateBalanceSheetProps {
  /** The account to update; null keeps the sheet closed. */
  line: UpdateTarget | null;
  today: string;
  onClose: () => void;
}

/**
 * The one-field balance update: the current value prefilled, a day, Save.
 * Saving the value the account already has writes nothing.
 */
export function UpdateBalanceSheet({
  line,
  today,
  onClose,
}: UpdateBalanceSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <PaneSheet
      isOpen={line !== null}
      onClose={onClose}
      label={t({ en: "Update balance", zh: "更新余额" })}
      initialFocusRef={inputRef}
    >
      {line ? (
        <UpdateBalanceForm
          key={line.account.id}
          target={line}
          today={today}
          inputRef={inputRef}
          onDone={onClose}
        />
      ) : null}
    </PaneSheet>
  );
}

interface UpdateBalanceFormProps {
  target: UpdateTarget;
  today: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDone: () => void;
}

function UpdateBalanceForm({
  target,
  today,
  inputRef,
  onDone,
}: UpdateBalanceFormProps) {
  const locale = useLocale();
  const showToast = useToast();
  const runUndoable = useUndoableMutations();
  const headingId = useId();
  const { account, bankLink } = target;
  const [day, setDay] = useState(today);
  const current = useReplica((snapshot) =>
    accountBalanceAt(
      account,
      selectBalanceSeriesByAccount(snapshot).get(account.id),
      day,
    ),
  );
  const [text, setText] = useState(() =>
    valuationInputText(current, account.kind, account.currency),
  );
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const field = {
    accountId: account.id,
    kind: account.kind,
    currency: account.currency,
    current,
  };
  const pending = buildValuationMutations(
    [field],
    new Map([[account.id, text]]),
    day,
  );
  const change = pending.changes.get(account.id);
  const sign = valuationInputSign(account.kind);
  const changeText = change
    ? [
        formatMoney(change.changeMinor, account.currency, locale, {
          signDisplay: "exceptZero",
        }),
        formatPercentChange(change.changeMinor, current * sign, locale),
      ]
        .filter((part) => part !== null)
        .join(" · ")
    : null;
  const isLiability = sideOfKind(account.kind) === "liability";
  const notAmount = t({
    en: "Enter an amount, such as 1250.00",
    zh: "请输入金额，例如 1250.00",
  });
  const saved = t({ en: "Balance updated", zh: "余额已更新" });
  const sentenceEnd = t({ en: ". ", zh: "。" });
  const failed = t({
    en: "The balance did not save. Try again.",
    zh: "余额未能保存，请重试。",
  });
  const unchanged = t({ en: "Balance unchanged", zh: "余额未变" });
  const detail = accountDetailLine(account, target.ownerName);

  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.invalid.length > 0) {
      setError(notAmount);
      return;
    }
    if (pending.large.length > 0 && !reviewing) {
      setReviewing(true);
      return;
    }
    const mutations = pending.valuations.map((args): LocalMutationInput => ({
      name: "putValuation",
      args,
    }));
    if (mutations.length === 0) {
      showToast({ message: unchanged, durationMs: 4000 });
    } else {
      try {
        runUndoable(mutations, { message: saved });
      } catch {
        showToast({ message: failed });
        return;
      }
    }
    onDone();
  }

  return (
    <form
      aria-labelledby={headingId}
      onSubmit={save}
      css={[stack.group, styles.form]}
    >
      <div css={stack.text}>
        <Heading id={headingId} level={2} look="h3">
          {account.name}
        </Heading>
        {detail ? (
          <Text look="bodySmall" tone="muted">
            {detail}
          </Text>
        ) : null}
      </div>
      <div css={stack.item}>
        <TextField
          ref={inputRef}
          size="lg"
          label={
            isLiability
              ? t({ en: "Amount owed", zh: "欠款金额" })
              : t({ en: "Balance", zh: "余额" })
          }
          description={`${t({ en: "Now", zh: "当前" })} ${formatMoney(current, account.currency, locale)}${changeText === null ? "" : ` · ${t({ en: "change", zh: "变化" })} ${changeText}`}`}
          error={error ?? undefined}
          leading={currencySymbol(account.currency, locale)}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          css={typeModifier.numeric}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
            setReviewing(false);
          }}
        />
        {bankLink?.bankBalanceMinor != null ? (
          <div css={cluster.tight}>
            <Text look="bodySmall" tone="muted" numeric>
              {`${t({ en: "Bank says", zh: "银行显示" })} ${formatMoney(bankLink.bankBalanceMinor, account.currency, locale)}`}
            </Text>
            <Button
              size="sm"
              look="outline"
              onClick={() => {
                if (bankLink.bankBalanceMinor === null) return;
                setText(
                  valuationInputText(
                    bankLink.bankBalanceMinor,
                    account.kind,
                    account.currency,
                  ),
                );
                if (bankLink.bankBalanceOn !== null)
                  setDay(bankLink.bankBalanceOn);
              }}
            >
              {t({ en: "Use", zh: "采用" })}
            </Button>
          </div>
        ) : null}
        <DayChips value={day} today={today} onChange={setDay} />
      </div>
      {reviewing && changeText !== null ? (
        <Callout
          intent="warning"
          title={t({ en: "That is a big change", zh: "变动较大" })}
        >
          {`${changeText}${sentenceEnd}${t({
            en: "Check for a typo, then save anyway.",
            zh: "请检查是否输错，确认后仍可保存。",
          })}`}
        </Callout>
      ) : null}
      <div css={cluster.tight}>
        <Button type="submit" look="primary">
          {reviewing
            ? t({ en: "Save anyway", zh: "仍然保存" })
            : t({ en: "Save", zh: "保存" })}
        </Button>
        <Button look="ghost" onClick={onDone}>
          {t({ en: "Cancel", zh: "取消" })}
        </Button>
      </div>
    </form>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: measure.short,
    marginInline: "auto",
  },
});

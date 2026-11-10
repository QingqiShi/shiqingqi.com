"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import { TextField } from "@tuja/ui/components/text-field";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { currencySymbol } from "../accounts/currency-symbol.ts";
import { accountSelectChildren } from "./account-select-children.tsx";
import { FieldLabel } from "./field-label.tsx";
import { PAYS_DOWN_KINDS } from "./pays-down-kinds.ts";
import type { TransactionForm } from "./use-transaction-form.ts";

export function PaysDownField({ form }: { form: TransactionForm }) {
  const {
    data,
    draft,
    locale,
    paysDownRef,
    paysDownAmountRef,
    errorOf,
    update,
    labelMark,
  } = form;
  const paysDownSelectChildren = accountSelectChildren(
    data,
    draft,
    (candidate) =>
      (PAYS_DOWN_KINDS.has(candidate.kind) &&
        candidate.id !== draft.accountId) ||
      candidate.id === draft.paysDownAccountId,
  );
  const paysDownAccount =
    draft.paysDownAccountId === null
      ? undefined
      : data.lookups.accountById.get(draft.paysDownAccountId);
  const canPayDown =
    draft.kind === "expense" &&
    !draft.refund &&
    data.accounts.some(
      (candidate) =>
        PAYS_DOWN_KINDS.has(candidate.kind) && candidate.closedOn === null,
    );

  return draft.paysDownAccountId !== null ? (
    <div
      role="group"
      aria-labelledby="finance-editor-pays-down"
      css={stack.tight}
    >
      <span css={[flex.between, styles.paysDownHeader]}>
        <FieldLabel id="finance-editor-pays-down" mark={labelMark("paysDown")}>
          {paysDownAccount?.kind === "receivable"
            ? t({ en: "Also adds to", zh: "同时计入" })
            : t({ en: "Also pays down", zh: "同时还款到" })}
        </FieldLabel>
        <Button
          size="sm"
          look="ghost"
          icon={<XIcon weight="bold" />}
          aria-label={t({
            en: "Remove the second account",
            zh: "移除第二个账户",
          })}
          onClick={() => {
            update({ paysDownAccountId: null, paysDownAmountText: "" }, [
              "paysDown",
            ]);
          }}
        />
      </span>
      <div css={styles.paysDownRow}>
        <Select
          ref={paysDownRef}
          label={t({ en: "Loan or card", zh: "贷款或信用卡" })}
          labelHidden
          size="sm"
          value={draft.paysDownAccountId}
          error={errorOf("paysDown")}
          onChange={(event) => {
            update({ paysDownAccountId: event.target.value || null }, [
              "paysDown",
            ]);
          }}
        >
          {paysDownSelectChildren}
        </Select>
        <TextField
          ref={paysDownAmountRef}
          label={t({ en: "Amount repaid", zh: "还款金额" })}
          labelHidden
          size="sm"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          leading={currencySymbol(
            paysDownAccount?.currency ?? data.baseCurrency,
            locale,
          )}
          value={draft.paysDownAmountText}
          error={errorOf("paysDownAmount")}
          controlCss={typeModifier.numeric}
          onChange={(event) => {
            update({ paysDownAmountText: event.target.value }, ["paysDown"]);
          }}
        />
      </div>
    </div>
  ) : canPayDown ? (
    <div>
      <Button
        size="sm"
        look="ghost"
        icon={<PlusIcon weight="bold" />}
        onClick={() => {
          const usable = data.openAccounts.filter(
            (candidate) =>
              PAYS_DOWN_KINDS.has(candidate.kind) &&
              candidate.id !== draft.accountId,
          );
          const first =
            usable.find((candidate) => candidate.kind === "loan") ??
            usable.at(0);
          if (!first) return;
          update(
            {
              paysDownAccountId: first.id,
              paysDownAmountText: draft.amountText,
            },
            ["paysDown"],
          );
        }}
      >
        {t({
          en: "Also pays down a loan or card",
          zh: "同时还款到贷款或信用卡",
        })}
      </Button>
    </div>
  ) : null;
}

const styles = stylex.create({
  paysDownHeader: {
    gap: rhythm.tight,
  },
  paysDownRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 9rem)",
    gap: rhythm.tight,
    alignItems: "start",
  },
});

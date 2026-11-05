"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import type { ToastAction } from "@tuja/ui/components/toast";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { useState, type ReactNode, type RefObject } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import type { QuickAddInterpretation } from "../transactions/interpret-quick-add.ts";
import type { TransactionKind } from "../transactions/transaction-filters.ts";
import { AmountFields } from "./amount-fields.tsx";
import { DetailFields } from "./detail-fields.tsx";
import {
  draftOfNew,
  draftOfRefund,
  draftOfTransaction,
} from "./draft-of-transaction.ts";
import type { EditorDraft } from "./editor-draft.ts";
import { EditorFooter } from "./editor-footer.tsx";
import { EditorHeading } from "./editor-heading.tsx";
import { ExistingTransactionActions } from "./existing-transaction-actions.tsx";
import type {
  FieldMarks,
  MarkedField,
  RequiredField,
} from "./marked-fields.ts";
import { PayeeFields, usePayeeSuggestion } from "./payee-fields.tsx";
import { ReviewNotice } from "./review-notice.tsx";
import { RuleOffer, useRuleOffer } from "./rule-offer.tsx";
import { TransferFields } from "./transfer-fields.tsx";
import { useEditorData, type EditorData } from "./use-editor-data.ts";
import { useTransactionForm } from "./use-transaction-form.ts";

export type EditorFocusTarget = RequiredField;

/** A new Transaction filled in already, such as from quick add. */
export interface EditorSeed {
  draft: EditorDraft;
  /** Where the filled fields came from. */
  marks?: FieldMarks;
  /** Fields the Member set, which a later reading of quick add keeps. */
  touched?: readonly MarkedField[];
  /** The field that takes focus; without it, the first field the draft leaves empty. */
  focus?: EditorFocusTarget;
}

/**
 * What the host of the editor does for it. `useTransactionTask` gives each
 * one from where the editor shows and where the visitor came from.
 */
export interface EditorHost {
  /**
   * Where focus goes when the editor opens; a new `nonce` asks again. Null
   * leaves focus to the host, such as to a quick add line above the editor.
   */
  focusRequest?: { target: EditorFocusTarget; nonce: number } | null;
  /** Receives the element that takes focus, for a sheet that moves focus after it opens. */
  focusTargetRef?: RefObject<HTMLElement | null>;
  close: () => void;
  /** After a save. `andNew` asks for a new Transaction; a new one starts again in place. */
  afterSave: (transactionId: string, andNew: boolean) => void;
  /** Opens another Transaction, such as the one a new Transaction duplicates. */
  openTransaction: (transactionId: string) => void;
  /** Starts a new refund of the Transaction. */
  refund: (transactionId: string) => void;
  /**
   * Reads a Transaction's labels before a save. The function it returns
   * gives the "Teach the AI" action for the toast after the save, when the
   * save corrected the AI's labels.
   */
  watchCorrection: (transactionId: string) => () => ToastAction | undefined;
}

interface TransactionEditorProps {
  /** The Transaction to edit, or null for a new one. */
  transactionId: string | null;
  /** The kind of a new Transaction. */
  initialKind?: TransactionKind;
  /** A new refund of this Transaction. */
  refundOfId?: string | null;
  /**
   * The account of a new Transaction, such as the account whose page is
   * open. A Payee's last account does not replace it.
   */
  initialAccountId?: string | null;
  /** A new Transaction filled in already, such as from quick add. */
  seed?: EditorSeed | null;
  /**
   * What the quick add line in `lead` means now. Each new reading fills the
   * fields the Member has not touched.
   */
  interpretation?: QuickAddInterpretation | null;
  /** A notice under the headline, such as one about the bank's records. */
  notice?: ReactNode;
  /** What the form starts with under its heading, such as a quick add line. */
  lead?: ReactNode;
  host: EditorHost;
}

function initialDraft(
  data: EditorData,
  transactionId: string | null,
  kind: TransactionKind,
  refundOfId: string | null,
  seed: EditorSeed | null,
  accountId: string | null,
) {
  if (transactionId !== null) return draftOfTransaction(data, transactionId);
  if (seed) return seed.draft;
  if (refundOfId) {
    const refund = draftOfRefund(data, refundOfId);
    if (refund) return refund;
  }
  return draftOfNew(data, kind, accountId);
}

/**
 * The Transaction form (design §9.2): every field has a default, so Enter
 * saves at any point; ⌘/Ctrl+Enter saves and starts a new one. Picking a
 * Payee fills in what its last Transaction had. An existing Transaction
 * saves as a patch of the changed fields, an Expected one confirms, one in
 * Review clears its flag.
 */
export function TransactionEditor(props: TransactionEditorProps) {
  const data = useEditorData();
  const [draft] = useState<EditorDraft | null>(() =>
    initialDraft(
      data,
      props.transactionId,
      props.initialKind ?? "expense",
      props.refundOfId ?? null,
      props.seed ?? null,
      props.initialAccountId ?? null,
    ),
  );
  const deleted =
    props.transactionId !== null &&
    data.transactionsTable.get(props.transactionId)?.deletedAt != null;
  if (!draft || deleted) {
    return (
      <div css={stack.item}>
        <p css={[typeRole.body, styles.muted]}>
          {deleted
            ? t({
                en: "This transaction was deleted.",
                zh: "这笔交易已删除。",
              })
            : t({
                en: "This transaction can't be found.",
                zh: "找不到这笔交易。",
              })}
        </p>
        <div>
          <Button onClick={props.host.close}>
            {t({ en: "Close", zh: "关闭" })}
          </Button>
        </div>
      </div>
    );
  }
  return <EditorForm {...props} data={data} initialDraft={draft} />;
}

interface EditorFormProps extends TransactionEditorProps {
  data: EditorData;
  initialDraft: EditorDraft;
}

function EditorForm({
  data,
  initialDraft,
  transactionId,
  initialAccountId,
  seed,
  interpretation,
  notice,
  lead,
  host,
}: EditorFormProps) {
  const form = useTransactionForm({
    data,
    initialDraft,
    transactionId,
    initialAccountId,
    seed,
    interpretation,
    host,
  });
  const {
    draft,
    locale,
    duplicate,
    failure,
    isPlace,
    heading,
    shownMoney,
    save,
    handleKeyDown,
  } = form;
  const suggestion = usePayeeSuggestion(form);
  const { offeredCadence, makeRule, decline } = useRuleOffer(form);

  return (
    <form
      noValidate
      aria-label={isPlace ? heading : undefined}
      aria-labelledby={isPlace ? undefined : "finance-editor-heading"}
      css={stack.group}
      onKeyDown={handleKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
    >
      <EditorHeading form={form} />

      {lead}

      {notice}

      <ReviewNotice form={form} />

      <AmountFields form={form} />

      {draft.kind === "transfer" ? (
        <TransferFields form={form} />
      ) : (
        <PayeeFields form={form} suggestion={suggestion} />
      )}

      <DetailFields form={form} />

      {offeredCadence === null ? null : (
        <RuleOffer
          cadence={offeredCadence}
          onMake={makeRule}
          onDecline={decline}
        />
      )}

      {duplicate ? (
        <Callout
          intent="warning"
          title={t({ en: "Looks like a duplicate", zh: "可能重复" })}
        >
          <div css={stack.tight}>
            <span>
              {`${displayDay(duplicate.date, locale, "weekday")} · ${shownMoney(duplicate)}`}
            </span>
            <div css={cluster.tight}>
              <Button size="sm" look="primary" type="submit">
                {t({ en: "Keep both", zh: "都保留" })}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  host.openTransaction(duplicate.id);
                }}
              >
                {t({ en: "Open existing", zh: "打开已有交易" })}
              </Button>
            </div>
          </div>
        </Callout>
      ) : null}

      {failure ? (
        <Callout intent="danger" role="alert">
          {failure}
        </Callout>
      ) : null}

      <ExistingTransactionActions form={form} makeRule={makeRule} />

      <p css={[typeRole.caption, styles.muted, styles.hint]}>
        {t({
          en: "Enter saves. ⌘ or Ctrl + Enter saves and starts another.",
          zh: "按 Enter 保存；⌘ 或 Ctrl + Enter 保存并再记一笔。",
        })}
      </p>

      <EditorFooter form={form} />
    </form>
  );
}

const styles = stylex.create({
  muted: {
    color: color.fgMuted,
  },
  hint: {
    display: { default: "none", [pointer.canHover]: "block" },
  },
});

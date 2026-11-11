"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import type { SuggestResponse } from "../ai/types.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { accountSelectChildren } from "./account-select-children.tsx";
import { CategoryPicker } from "./category-picker.tsx";
import { Combobox, type ComboboxOption } from "./combobox.tsx";
import type { EditorDraft } from "./editor-draft.ts";
import { FieldLabel } from "./field-label.tsx";
import {
  MARKED_FIELDS,
  type FieldMarks,
  type MarkedField,
} from "./marked-fields.ts";
import { PaysDownField } from "./pays-down-field.tsx";
import { prefillFromPayee } from "./prefill-from-payee.ts";
import { rankPayees } from "./rank-payees.ts";
import { topCategories } from "./top-categories.ts";
import type { TransactionForm } from "./use-transaction-form.ts";

export function usePayeeSuggestion(form: TransactionForm) {
  const {
    data,
    draft,
    currency,
    existing,
    touched,
    update,
    isUsableAccount,
    isActiveMember,
  } = form;
  const [suggestState, setSuggestState] = useState<"idle" | "busy" | "failed">(
    "idle",
  );

  const applySuggestion = (suggestion: SuggestResponse) => {
    const payee =
      suggestion.payeeId === null
        ? undefined
        : data.lookups.payeeById.get(suggestion.payeeId);
    const category =
      suggestion.categoryId === null
        ? undefined
        : data.lookups.categoryById.get(suggestion.categoryId);
    const fields: Partial<EditorDraft> = {
      kind: suggestion.kind,
      tagIds: suggestion.tagIds,
      categoryId: category?.kind === suggestion.kind ? category.id : null,
      refund: suggestion.kind === "expense" ? draft.refund : false,
    };
    if (payee) {
      fields.payeeId = payee.id;
      fields.payeeName = payee.name;
    } else if (suggestion.newPayeeName) {
      fields.payeeName = suggestion.newPayeeName;
    }
    if (
      suggestion.kind === "transfer" &&
      suggestion.toAccountId !== null &&
      isUsableAccount(suggestion.toAccountId)
    ) {
      fields.toAccountId = suggestion.toAccountId;
    }
    if (
      suggestion.memberId &&
      isActiveMember(suggestion.memberId) &&
      !touched.has("member")
    ) {
      fields.memberId = suggestion.memberId;
    }
    update(fields);
    setSuggestState("idle");
  };

  const suggest = async () => {
    const text = [draft.payeeName, draft.note].join(" ").trim();
    if (text === "" || draft.accountId === null) return;
    const request = {
      ...(existing ? { transactionId: existing.id } : {}),
      text,
      amountMinor:
        (draft.kind === "income" || draft.refund ? 1 : -1) *
        Math.abs(parseMoney(draft.amountText, currency) ?? 0),
      date: draft.date,
      accountId: draft.accountId,
    };
    setSuggestState("busy");
    try {
      applySuggestion(await bankApiClient.suggest(request));
    } catch {
      setSuggestState("failed");
    }
  };

  return { suggestState, setSuggestState, suggest };
}

interface PayeeFieldsProps {
  form: TransactionForm;
  suggestion: ReturnType<typeof usePayeeSuggestion>;
}

export function PayeeFields({ form, suggestion }: PayeeFieldsProps) {
  const {
    data,
    draft,
    touched,
    marks,
    setMarks,
    categoryRef,
    accountRef,
    errorOf,
    categoryName,
    update,
    isUsableAccount,
    isActiveMember,
    ownerOf,
    labelMark,
  } = form;
  const { suggestState, setSuggestState, suggest } = suggestion;
  const { readOnly } = useFinanceRuntime();
  const newPayeeLabel = t({ en: "New payee", zh: "新商家" });
  const choosePayee = (payeeId: string, name: string) => {
    const next: Partial<EditorDraft> = { payeeId, payeeName: name };
    if (draft.kind === "transfer") {
      update(next, ["payee"]);
      return;
    }
    const prefill = prefillFromPayee({
      kind: draft.kind,
      payee: data.lookups.payeeById.get(payeeId),
      history: data.byPayee.get(payeeId) ?? [],
      entriesByTransaction: data.entriesByTransaction,
      tagIdsByTransaction: data.tagIdsByTransaction,
      categoryById: data.lookups.categoryById,
      isUsableAccount,
      isActiveMember,
      ruleTemplate: data.rules.find((rule) => rule.template.payeeId === payeeId)
        ?.template,
    });
    const applied = new Set<MarkedField>();
    if (prefill.categoryId !== null && !touched.has("category")) {
      next.categoryId = prefill.categoryId;
      if (prefill.fromLastTime.has("category")) applied.add("category");
    }
    if (prefill.accountId !== null && !touched.has("account")) {
      next.accountId = prefill.accountId;
      if (prefill.fromLastTime.has("account")) applied.add("account");
    }
    if (!touched.has("member")) {
      const memberId =
        prefill.memberId ?? ownerOf(next.accountId ?? draft.accountId);
      if (memberId !== null) next.memberId = memberId;
      if (prefill.fromLastTime.has("member")) applied.add("member");
    }
    if (!touched.has("tags") && prefill.tagIds.length > 0) {
      next.tagIds = prefill.tagIds;
      applied.add("tags");
    }
    if (
      !touched.has("paysDown") &&
      prefill.paysDown &&
      draft.kind === "expense" &&
      !draft.refund &&
      prefill.paysDown.accountId !== (next.accountId ?? draft.accountId)
    ) {
      next.paysDownAccountId = prefill.paysDown.accountId;
      next.paysDownAmountText = minorUnitsToDecimalString(
        prefill.paysDown.amountMinor,
        data.lookups.accountById.get(prefill.paysDown.accountId)?.currency ??
          data.baseCurrency,
      );
      if (prefill.fromLastTime.has("paysDown")) applied.add("paysDown");
    }
    const nextMarks: FieldMarks = { ...marks, payee: undefined };
    for (const field of MARKED_FIELDS) {
      if (nextMarks[field]?.source === "lastTime") nextMarks[field] = undefined;
    }
    for (const field of applied) {
      nextMarks[field] = { source: "lastTime", unsure: false };
    }
    update(next, ["payee"]);
    setMarks(nextMarks);
  };

  const payeeOptions: ComboboxOption[] = rankPayees(
    draft.payeeName,
    data.payees,
    { lastUsedById: data.lastUsedByPayee },
  ).map((payee) => {
    const last = data.byPayee.get(payee.id)?.at(0);
    const category =
      last?.categoryId == null
        ? undefined
        : data.lookups.categoryById.get(last.categoryId);
    return {
      id: payee.id,
      label: payee.name,
      leading: category
        ? data.lookups.categoryEmojiById.get(category.id) || undefined
        : undefined,
      detail: category ? categoryName(category) : undefined,
    };
  });

  const kindCategories =
    draft.kind === "transfer"
      ? []
      : data.categories.filter((category) => category.kind === draft.kind);
  const topIds =
    draft.kind === "transfer"
      ? []
      : topCategories({
          kind: draft.kind,
          payeeHistory:
            draft.payeeId === null
              ? []
              : (data.byPayee.get(draft.payeeId) ?? []),
          recent: data.transactions,
          categories: kindCategories,
        });
  const accountOptions = accountSelectChildren(
    data,
    draft,
    (candidate) => !candidate.isSystem || candidate.id === draft.accountId,
  );

  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <FieldLabel mark={labelMark("payee")}>
          {t({ en: "Payee", zh: "商家" })}
        </FieldLabel>
        <Combobox
          label={t({ en: "Payee", zh: "商家" })}
          labelHidden
          value={draft.payeeName}
          options={payeeOptions}
          placeholder={t({
            en: "Tesco, Netflix, a friend…",
            zh: "例如 Tesco、Netflix、朋友…",
          })}
          createLabel={(name) => `${newPayeeLabel} “${name}”`}
          onValueChange={(payeeName) => {
            const chosen = data.payees.find(
              (payee) => payee.id === draft.payeeId,
            );
            update(
              {
                payeeName,
                payeeId: chosen?.name === payeeName ? chosen.id : null,
              },
              ["payee"],
            );
            if (suggestState !== "idle") setSuggestState("idle");
          }}
          onSelect={(option) => {
            choosePayee(option.id, option.label);
          }}
        />
        {!readOnly &&
        draft.payeeId === null &&
        draft.payeeName.trim() !== "" ? (
          <div css={cluster.tight}>
            <Button
              size="sm"
              look="outline"
              icon={<SparkleIcon weight="bold" />}
              loading={suggestState === "busy"}
              onClick={() => {
                void suggest();
              }}
            >
              {t({ en: "Suggest", zh: "智能建议" })}
            </Button>
            {suggestState === "failed" ? (
              <span role="status">
                <Text as="span" look="caption" tone="muted">
                  {t({
                    en: "No suggestion right now. Pick a category below.",
                    zh: "暂时没有建议，请在下方选择分类。",
                  })}
                </Text>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <CategoryPicker
        categories={kindCategories}
        emojiById={data.lookups.categoryEmojiById}
        topIds={topIds}
        value={draft.categoryId}
        mark={labelMark("category")}
        error={errorOf("category")}
        firstChipRef={categoryRef}
        onChange={(categoryId) => {
          update({ categoryId }, ["category"]);
        }}
      />

      <div css={stack.tight}>
        <FieldLabel mark={labelMark("account")}>
          {t({ en: "Account", zh: "账户" })}
        </FieldLabel>
        <Select
          id="finance-editor-account"
          ref={accountRef}
          label={t({ en: "Account", zh: "账户" })}
          labelHidden
          value={draft.accountId ?? ""}
          placeholder={t({ en: "Choose an account", zh: "选择账户" })}
          error={errorOf("account")}
          onChange={(event) => {
            const accountId = event.target.value || null;
            const fields: Partial<EditorDraft> = { accountId };
            const owner = ownerOf(accountId);
            if (!touched.has("member") && owner !== null) {
              fields.memberId = owner;
            }
            update(fields, ["account"]);
          }}
        >
          {accountOptions}
        </Select>
      </div>

      <PaysDownField form={form} />
    </div>
  );
}

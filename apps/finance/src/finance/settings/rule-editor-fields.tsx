"use client";

import { t } from "@tuja/i18n";
import { Callout } from "@tuja/ui/components/callout";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  NON_BUSINESS_DAYS,
  type NonBusinessDay,
} from "../domain/dates/to-business-day.ts";
import type { RuleRow } from "../sync/row-schemas.ts";
import { RuleTemplateFields } from "./rule-template-fields.tsx";
import type { RuleDraft } from "./use-rule-editor.ts";

type Unit = RuleRow["unit"];
const UNITS: readonly Unit[] = ["week", "month", "year"];

interface RuleEditorFieldsProps {
  draft: RuleDraft;
  setDraft: Dispatch<SetStateAction<RuleDraft | null>>;
  error: string | undefined;
  templateEditable: boolean;
  autoPostBlocked: boolean;
  payeeRef: RefObject<HTMLInputElement | null>;
  nameRef: RefObject<HTMLInputElement | null>;
}

export function RuleEditorFields({
  draft,
  setDraft,
  error,
  templateEditable,
  autoPostBlocked,
  payeeRef,
  nameRef,
}: RuleEditorFieldsProps) {
  const unitLabels: Record<Unit, string> = {
    week: t({ en: "weeks", zh: "周" }),
    month: t({ en: "months", zh: "个月" }),
    year: t({ en: "years", zh: "年" }),
  };
  const everyLabel = t({ en: "Every", zh: "每" });
  const nonBusinessDayLabels: Record<NonBusinessDay, string> = {
    stay: t({ en: "Keep the date", zh: "日期不变" }),
    next: t({ en: "Move to the next working day", zh: "顺延到下一个工作日" }),
    previous: t({
      en: "Move to the working day before",
      zh: "提前到上一个工作日",
    }),
  };

  return (
    <>
      {error ? (
        <Callout intent="destructive" role="alert">
          {error}
        </Callout>
      ) : null}
      {draft.rule === null ? (
        <SegmentedControl
          aria-label={t({ en: "Kind", zh: "类型" })}
          fullWidth
          options={[
            { value: "expense", label: t({ en: "Expense", zh: "支出" }) },
            { value: "income", label: t({ en: "Income", zh: "收入" }) },
            {
              value: "transfer",
              label: t({ en: "Transfer", zh: "转账" }),
            },
          ]}
          value={draft.fields.kind}
          onChange={(kind) => {
            setDraft({
              ...draft,
              fields: { ...draft.fields, kind, categoryId: "" },
            });
          }}
        />
      ) : null}
      {templateEditable ? (
        <RuleTemplateFields
          value={draft.fields}
          payeeRef={payeeRef}
          baseCurrencyOnly={draft.rule !== null}
          onChange={(fields) => {
            setDraft({ ...draft, fields });
          }}
          onPayeePicked={(payeeName) => {
            setDraft((current) =>
              current && current.name.trim() === ""
                ? { ...current, name: payeeName }
                : current,
            );
          }}
        />
      ) : null}
      <TextField
        ref={nameRef}
        label={t({ en: "Name", zh: "名称" })}
        value={draft.name}
        onChange={(event) => {
          setDraft({ ...draft, name: event.target.value });
        }}
      />
      {templateEditable ? (
        <TextField
          label={t({ en: "Amount", zh: "金额" })}
          inputMode="decimal"
          value={draft.amount}
          onChange={(event) => {
            setDraft({ ...draft, amount: event.target.value });
          }}
        />
      ) : null}
      <div css={cluster.item}>
        <TextField
          label={everyLabel}
          inputMode="numeric"
          value={draft.interval}
          onChange={(event) => {
            setDraft({ ...draft, interval: event.target.value });
          }}
        />
        <Select
          label={t({ en: "Unit", zh: "单位" })}
          value={draft.unit}
          options={UNITS.map((unit) => ({
            value: unit,
            label: unitLabels[unit],
          }))}
          onChange={(event) => {
            const unit = UNITS.find((value) => value === event.target.value);
            if (unit) setDraft({ ...draft, unit, day: "" });
          }}
        />
      </div>
      <TextField
        label={
          draft.unit === "week"
            ? t({ en: "Weekday (1 is Monday)", zh: "星期几（1 为周一）" })
            : t({ en: "Day of the month", zh: "每月几号" })
        }
        description={t({
          en: "Leave empty to use the start day.",
          zh: "留空则按开始日期。",
        })}
        inputMode="numeric"
        value={draft.day}
        onChange={(event) => {
          setDraft({ ...draft, day: event.target.value });
        }}
      />
      <Select
        label={t({
          en: "On a weekend or bank holiday",
          zh: "遇周末或节假日",
        })}
        description={t({
          en: "Bank holidays are those of England and Wales.",
          zh: "节假日按英格兰和威尔士的银行假日计算。",
        })}
        value={draft.nonBusinessDay}
        options={NON_BUSINESS_DAYS.map((value) => ({
          value,
          label: nonBusinessDayLabels[value],
        }))}
        onChange={(event) => {
          const nonBusinessDay = NON_BUSINESS_DAYS.find(
            (value) => value === event.target.value,
          );
          if (nonBusinessDay) setDraft({ ...draft, nonBusinessDay });
        }}
      />
      {draft.rule === null ? (
        <TextField
          type="date"
          label={t({ en: "Starts on", zh: "开始日期" })}
          description={t({
            en: "The first expected transaction falls on or after this day, and never before today.",
            zh: "第一笔待确认交易在这天或之后，且不早于今天。",
          })}
          value={draft.startsOn}
          onChange={(event) => {
            setDraft({ ...draft, startsOn: event.target.value });
          }}
        />
      ) : null}
      <TextField
        type="date"
        label={t({ en: "Ends on", zh: "结束日期" })}
        description={t({
          en: "Leave empty to repeat with no end.",
          zh: "留空则一直重复。",
        })}
        value={draft.endsOn}
        onChange={(event) => {
          setDraft({ ...draft, endsOn: event.target.value });
        }}
      />
      <Checkbox
        label={t({
          en: "Post on the day without asking",
          zh: "到期自动入账，无需确认",
        })}
        description={
          autoPostBlocked
            ? t({
                en: "Bank sync brings in this account's transactions.",
                zh: "该账户的交易由银行同步导入。",
              })
            : undefined
        }
        disabled={autoPostBlocked}
        checked={draft.autoPost && !autoPostBlocked}
        onChange={(event) => {
          setDraft({ ...draft, autoPost: event.target.checked });
        }}
      />
      {draft.rule === null ? null : (
        <Checkbox
          label={t({ en: "Paused", zh: "暂停" })}
          description={t({
            en: "A paused rule adds nothing until you resume it.",
            zh: "暂停期间不会生成交易。",
          })}
          checked={draft.paused}
          onChange={(event) => {
            setDraft({ ...draft, paused: event.target.checked });
          }}
        />
      )}
    </>
  );
}

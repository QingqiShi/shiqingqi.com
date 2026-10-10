"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useRef, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectFxIndex } from "../store/select-fx-index.ts";
import type { RuleRow } from "../sync/row-schemas.ts";
import { buildNewRule } from "./build-new-rule.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { NewRuleFields, type NewRuleFieldsDraft } from "./new-rule-fields.tsx";
import { SettingsList } from "./settings-list.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";
import { templateAmount, withTemplateAmount } from "./with-template-amount.ts";

type Unit = RuleRow["unit"];
const UNITS: readonly Unit[] = ["week", "month", "year"];

interface Draft {
  /** Null while making a new Rule from scratch. */
  rule: RuleRow | null;
  /** The new Rule's kind, Payee, accounts and Category. */
  fresh: NewRuleFieldsDraft;
  startsOn: string;
  name: string;
  amount: string;
  unit: Unit;
  interval: string;
  day: string;
  endsOn: string;
  autoPost: boolean;
  paused: boolean;
}

function scheduleDay(rule: RuleRow) {
  if (rule.unit === "week") return String(rule.weekday ?? "");
  return String(rule.dayOfMonth ?? "");
}

const EMPTY_FRESH: NewRuleFieldsDraft = {
  kind: "expense",
  payeeText: "",
  payeeId: null,
  accountId: "",
  toAccountId: "",
  categoryId: "",
};

/** The recurring Rules: make one from scratch, change its schedule and amount, pause or resume, delete. */
export function RulesSettings() {
  const locale = useLocale();
  const today = useHouseholdToday();
  const rules = useReplica(liveRowSelectors.rules);
  const payees = useReplica(liveRowSelectors.payees);
  const accounts = useReplica((snapshot) => snapshot.tables.accounts);
  const fx = useReplica(selectFxIndex);
  const payeeRef = useRef<HTMLInputElement>(null);
  const baseCurrency = useBaseCurrency();
  const apply = useApplyMutations();
  const nameRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | undefined>();
  const isBase = (accountId: string) =>
    accounts.get(accountId)?.currency === baseCurrency;

  const unitLabels: Record<Unit, string> = {
    week: t({ en: "weeks", zh: "周" }),
    month: t({ en: "months", zh: "个月" }),
    year: t({ en: "years", zh: "年" }),
  };
  const everyLabel = t({ en: "Every", zh: "每" });
  const onceLabels: Record<Unit, string> = {
    week: t({ en: "Weekly", zh: "每周" }),
    month: t({ en: "Monthly", zh: "每月" }),
    year: t({ en: "Yearly", zh: "每年" }),
  };
  const nextLabel = t({ en: "next", zh: "下次" });
  const pausedLabel = t({ en: "Paused", zh: "已暂停" });
  const autoLabel = t({ en: "Posts automatically", zh: "自动入账" });
  const pauseLabel = t({ en: "Pause", zh: "暂停" });
  const resumeLabel = t({ en: "Resume", zh: "恢复" });
  const messages = {
    amount: t({ en: "Enter an amount above zero", zh: "请输入大于零的金额" }),
    interval: t({
      en: "Enter a whole number from 1 to 99",
      zh: "请输入 1 到 99 之间的整数",
    }),
    day: t({
      en: "Enter 1 to 7 for a weekday, or 1 to 31 for a day of the month",
      zh: "星期请填 1 到 7，日期请填 1 到 31",
    }),
    name: t({ en: "Give the rule a name", zh: "请填写规则名称" }),
    startsOn: t({ en: "Pick a start date", zh: "请选择开始日期" }),
    account: t({ en: "Pick an account", zh: "请选择账户" }),
    toAccount: t({
      en: "Pick the account the money goes to",
      zh: "请选择转入账户",
    }),
    sameAccount: t({
      en: "A transfer needs two different accounts",
      zh: "转账需要两个不同的账户",
    }),
    currency: t({
      en: "A recurring transfer needs two accounts in the same currency",
      zh: "周期转账的两个账户需使用同一币种",
    }),
    category: t({ en: "Pick a category", zh: "请选择分类" }),
    paused: t({ en: "Rule paused", zh: "规则已暂停" }),
    resumed: t({ en: "Rule resumed", zh: "规则已恢复" }),
    deleted: t({ en: "Rule deleted", zh: "规则已删除" }),
    added: t({ en: "Rule added", zh: "规则已添加" }),
    saved: t({ en: "Rule saved", zh: "规则已保存" }),
  };

  function summary(rule: RuleRow) {
    return [
      formatMoney(templateAmount(rule.template), baseCurrency, locale),
      rule.interval === 1
        ? onceLabels[rule.unit]
        : `${everyLabel} ${String(rule.interval)} ${unitLabels[rule.unit]}`,
      rule.pausedAt === null
        ? `${nextLabel} ${displayDay(rule.nextOn, locale, "day")}`
        : "",
    ]
      .filter((part) => part !== "")
      .join(" · ");
  }

  function readSchedule(current: Draft) {
    const interval = Number(current.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 99) {
      setError(messages.interval);
      return null;
    }
    const day = current.day.trim() === "" ? null : Number(current.day);
    const maxDay = current.unit === "week" ? 7 : 31;
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > maxDay)) {
      setError(messages.day);
      return null;
    }
    return { interval, day };
  }

  function saveNew(current: Draft) {
    const { fresh } = current;
    const existingPayee =
      fresh.payeeId === null
        ? payees.find(
            (payee) =>
              payee.mergedIntoId === null &&
              payee.name.toLocaleLowerCase() ===
                fresh.payeeText.trim().toLocaleLowerCase(),
          )
        : undefined;
    const payeeName = fresh.payeeText.trim();
    const name = current.name.trim() === "" ? payeeName : current.name.trim();
    if (name === "") {
      setError(messages.name);
      return false;
    }
    const account = accounts.get(fresh.accountId);
    if (!account) {
      setError(messages.account);
      return false;
    }
    const amount = parseMoney(current.amount, account.currency);
    if (amount === null || amount <= 0) {
      setError(messages.amount);
      return false;
    }
    const schedule = readSchedule(current);
    if (!schedule) return false;
    if (!isValidDay(current.startsOn)) {
      setError(messages.startsOn);
      return false;
    }
    const newPayeeId =
      fresh.payeeId === null && !existingPayee && payeeName !== ""
        ? crypto.randomUUID()
        : null;
    const built = buildNewRule(
      {
        id: crypto.randomUUID(),
        name,
        kind: fresh.kind,
        amountMinor: amount,
        accountId: fresh.accountId,
        toAccountId: fresh.toAccountId,
        payeeId: fresh.payeeId ?? existingPayee?.id ?? newPayeeId,
        categoryId: fresh.categoryId === "" ? null : fresh.categoryId,
        unit: current.unit,
        interval: schedule.interval,
        day: schedule.day,
        startsOn: current.startsOn,
        endsOn: isValidDay(current.endsOn) ? current.endsOn : null,
        autoPost: current.autoPost,
        today,
      },
      { accountById: accounts, baseCurrency, fx },
    );
    if (!built.ok) {
      setError(messages[built.error]);
      return false;
    }
    return apply(
      [
        ...(newPayeeId === null
          ? []
          : [
              {
                name: "upsertPayee" as const,
                args: { id: newPayeeId, name: payeeName },
              },
            ]),
        { name: "upsertRule", args: built.args },
      ],
      { message: messages.added },
    );
  }

  function save() {
    if (!draft) return false;
    const { rule } = draft;
    if (rule === null) return saveNew(draft);
    if (draft.name.trim() === "") {
      setError(messages.name);
      return false;
    }
    const schedule = readSchedule(draft);
    if (!schedule) return false;
    const { interval, day } = schedule;
    let template = rule.template;
    const editable = withTemplateAmount(
      rule.template,
      templateAmount(rule.template),
      isBase,
    );
    if (editable) {
      const amount = parseMoney(draft.amount, baseCurrency);
      if (amount === null || amount <= 0) {
        setError(messages.amount);
        return false;
      }
      template =
        withTemplateAmount(rule.template, amount, isBase) ?? rule.template;
    }
    return apply(
      [
        {
          name: "upsertRule",
          args: {
            id: rule.id,
            name: draft.name.trim(),
            unit: draft.unit,
            interval,
            weekday: draft.unit === "week" ? day : null,
            dayOfMonth: draft.unit === "week" ? null : day,
            endsOn: isValidDay(draft.endsOn) ? draft.endsOn : null,
            autoPost: draft.autoPost,
            paused: draft.paused,
            ...(template === rule.template ? {} : { template }),
          },
        },
      ],
      { message: messages.saved },
    );
  }

  const amountEditable =
    draft !== null &&
    (draft.rule === null ||
      withTemplateAmount(
        draft.rule.template,
        templateAmount(draft.rule.template),
        isBase,
      ) !== null);

  function toggle(rule: RuleRow) {
    const pausing = rule.pausedAt === null;
    apply([{ name: "upsertRule", args: { id: rule.id, paused: pausing } }], {
      message: pausing ? messages.paused : messages.resumed,
    });
  }

  return (
    <SettingsPanel
      title={t({ en: "Recurring rules", zh: "周期规则" })}
      description={t({
        en: "Each rule adds an expected transaction before it happens. Confirm it on the day, or let the bank sync match it.",
        zh: "每条规则会提前生成待确认交易；到期时确认，或由银行同步自动匹配。",
      })}
      actions={
        <Button
          size="sm"
          icon={<PlusIcon weight="bold" />}
          onClick={() => {
            setError(undefined);
            setDraft({
              rule: null,
              fresh: EMPTY_FRESH,
              startsOn: today,
              name: "",
              amount: "",
              unit: "month",
              interval: "1",
              day: "",
              endsOn: "",
              autoPost: false,
              paused: false,
            });
          }}
        >
          {t({ en: "New rule", zh: "新建规则" })}
        </Button>
      }
    >
      {rules.length === 0 ? (
        <Text look="bodySmall" tone="muted">
          {t({
            en: "No rules yet. Start a new rule, or make one from a transaction that repeats.",
            zh: "还没有规则。可在这里新建，或从重复出现的交易创建。",
          })}
        </Text>
      ) : (
        <SettingsList>
          {rules.map((rule) => (
            <SettingsRow
              key={rule.id}
              title={rule.name}
              detail={summary(rule)}
              trailing={
                <span css={cluster.inline}>
                  {rule.autoPost ? (
                    <Badge size="sm" intent="neutral">
                      {autoLabel}
                    </Badge>
                  ) : null}
                  {rule.pausedAt === null ? null : (
                    <Badge size="sm" intent="warning">
                      {pausedLabel}
                    </Badge>
                  )}
                </span>
              }
              actions={
                <Button
                  size="sm"
                  look="ghost"
                  aria-label={`${rule.pausedAt === null ? pauseLabel : resumeLabel}: ${rule.name}`}
                  onClick={() => {
                    toggle(rule);
                  }}
                >
                  {rule.pausedAt === null ? pauseLabel : resumeLabel}
                </Button>
              }
              onClick={() => {
                setError(undefined);
                setDraft({
                  rule,
                  fresh: EMPTY_FRESH,
                  startsOn: rule.startsOn,
                  name: rule.name,
                  amount: minorUnitsToDecimalString(
                    templateAmount(rule.template),
                    baseCurrency,
                  ),
                  unit: rule.unit,
                  interval: String(rule.interval),
                  day: scheduleDay(rule),
                  endsOn: rule.endsOn ?? "",
                  autoPost: rule.autoPost,
                  paused: rule.pausedAt !== null,
                });
              }}
            />
          ))}
        </SettingsList>
      )}
      <EditSheet
        isOpen={draft !== null}
        onClose={() => {
          setDraft(null);
        }}
        title={
          draft?.rule === null
            ? t({ en: "New rule", zh: "新建规则" })
            : t({ en: "Edit rule", zh: "编辑规则" })
        }
        initialFocusRef={draft?.rule === null ? payeeRef : nameRef}
        onSave={save}
        danger={
          draft?.rule
            ? {
                label: t({ en: "Delete", zh: "删除" }),
                onAction: () => {
                  const id = draft.rule?.id;
                  if (id === undefined) return;
                  apply([{ name: "upsertRule", args: { id, deleted: true } }], {
                    message: messages.deleted,
                  });
                },
              }
            : undefined
        }
      >
        {draft ? (
          <>
            {error ? (
              <Callout intent="danger" role="alert">
                {error}
              </Callout>
            ) : null}
            {draft.rule === null ? (
              <NewRuleFields
                value={draft.fresh}
                payeeRef={payeeRef}
                onChange={(fresh) => {
                  setDraft({ ...draft, fresh });
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
            {amountEditable ? (
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
                  const unit = UNITS.find(
                    (value) => value === event.target.value,
                  );
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
              checked={draft.autoPost}
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
        ) : null}
      </EditSheet>
    </SettingsPanel>
  );
}

import { t } from "@tuja/i18n";
import { useState } from "react";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import type { NonBusinessDay } from "../domain/dates/to-business-day.ts";
import { isValidDay } from "../domain/dates/to-epoch-day.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { normalisePayeeText } from "../editor/rank-payees.ts";
import { mayAutoPost } from "../reconciliation/may-auto-post.ts";
import { useReplica } from "../replica/use-replica.ts";
import { sameTemplate } from "../rules/same-template.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectBankLinkedAccountIds } from "../store/select-bank-linked-account-ids.ts";
import type { RuleRow } from "../sync/row-schemas.ts";
import { buildNewRule } from "./build-new-rule.ts";
import { editRuleTemplate } from "./edit-rule-template.ts";
import type { RuleTemplateFieldsDraft } from "./rule-template-fields.tsx";
import {
  simpleTemplateAccounts,
  templateAmount,
} from "./simple-template-accounts.ts";
import { useApplyMutations } from "./use-apply-mutations.ts";

type Unit = RuleRow["unit"];

export interface RuleDraft {
  /** Null while making a new Rule from scratch. */
  rule: RuleRow | null;
  /** The kind, Payee, accounts and Category of the template. */
  fields: RuleTemplateFieldsDraft;
  startsOn: string;
  name: string;
  amount: string;
  unit: Unit;
  interval: string;
  day: string;
  nonBusinessDay: NonBusinessDay;
  endsOn: string;
  autoPost: boolean;
  paused: boolean;
}

function scheduleDay(rule: RuleRow) {
  if (rule.unit === "week") return String(rule.weekday ?? "");
  return String(rule.dayOfMonth ?? "");
}

/** The accounts the template Entries made from these fields go on. */
function templateFieldsAccounts({
  kind,
  accountId,
  toAccountId,
}: RuleTemplateFieldsDraft) {
  return kind === "transfer"
    ? [{ accountId }, { accountId: toAccountId }]
    : [{ accountId }];
}

const EMPTY_FIELDS: RuleTemplateFieldsDraft = {
  kind: "expense",
  payeeText: "",
  payeeId: null,
  accountId: "",
  toAccountId: "",
  categoryId: "",
};

export function useRuleEditor() {
  const today = useHouseholdToday();
  const payees = useReplica(liveRowSelectors.payees);
  const accounts = useReplica((snapshot) => snapshot.tables.accounts);
  const bankLinkedAccountIds = useReplica(selectBankLinkedAccountIds);
  const baseCurrency = useBaseCurrency();
  const apply = useApplyMutations();
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [error, setError] = useState<string | undefined>();
  const isBase = (accountId: string) =>
    accounts.get(accountId)?.currency === baseCurrency;
  const templateCurrency = (rule: RuleRow) =>
    accounts.get(rule.template.entries[0]?.accountId ?? "")?.currency ??
    baseCurrency;

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
    added: t({ en: "Rule added", zh: "规则已添加" }),
    saved: t({ en: "Rule saved", zh: "规则已保存" }),
  };

  function readSchedule(current: RuleDraft) {
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

  const templateEditable =
    draft !== null &&
    (draft.rule === null ||
      simpleTemplateAccounts(draft.rule.template, isBase) !== null);

  const autoPostBlocked =
    draft !== null &&
    !mayAutoPost(
      draft.rule !== null && !templateEditable
        ? draft.rule.template.entries
        : templateFieldsAccounts(draft.fields),
      (accountId) => bankLinkedAccountIds.has(accountId),
    );

  /** The Payee the text names, and a new one to add when no Payee has that name. */
  function resolvePayee(fields: RuleTemplateFieldsDraft) {
    if (fields.payeeId !== null) {
      return { payeeId: fields.payeeId, mutations: [] };
    }
    const name = fields.payeeText.trim();
    if (name === "") return { payeeId: null, mutations: [] };
    const wanted = normalisePayeeText(name);
    const existing = payees.find(
      (payee) =>
        payee.mergedIntoId === null &&
        normalisePayeeText(payee.name) === wanted,
    );
    if (existing) return { payeeId: existing.id, mutations: [] };
    const payeeId = crypto.randomUUID();
    return {
      payeeId,
      mutations: [
        {
          name: "upsertPayee" as const,
          args: { id: payeeId, name: name.slice(0, 200) },
        },
      ],
    };
  }

  function saveNew(current: RuleDraft) {
    const { fields } = current;
    const payeeName = fields.payeeText.trim();
    const name = current.name.trim() === "" ? payeeName : current.name.trim();
    if (name === "") {
      setError(messages.name);
      return false;
    }
    const account = accounts.get(fields.accountId);
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
    const payee = resolvePayee(fields);
    const built = buildNewRule(
      {
        id: crypto.randomUUID(),
        name,
        kind: fields.kind,
        amountMinor: amount,
        accountId: fields.accountId,
        toAccountId: fields.toAccountId,
        payeeId: payee.payeeId,
        categoryId: fields.categoryId === "" ? null : fields.categoryId,
        unit: current.unit,
        interval: schedule.interval,
        day: schedule.day,
        nonBusinessDay: current.nonBusinessDay,
        startsOn: current.startsOn,
        endsOn: isValidDay(current.endsOn) ? current.endsOn : null,
        autoPost: current.autoPost && !autoPostBlocked,
        today,
      },
      { accountById: accounts },
    );
    if (!built.ok) {
      setError(messages[built.error]);
      return false;
    }
    return apply(
      [...payee.mutations, { name: "upsertRule", args: built.args }],
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
    const payee = resolvePayee(draft.fields);
    let template = rule.template;
    if (templateEditable) {
      const amount = parseMoney(draft.amount, baseCurrency);
      if (amount === null || amount <= 0) {
        setError(messages.amount);
        return false;
      }
      const edited = editRuleTemplate(
        rule.template,
        {
          amountMinor: amount,
          accountId: draft.fields.accountId,
          toAccountId: draft.fields.toAccountId,
          payeeId: payee.payeeId,
          categoryId:
            draft.fields.categoryId === "" ? null : draft.fields.categoryId,
        },
        { accountById: accounts, isBaseCurrency: isBase },
      );
      if (!edited.ok) {
        setError(messages[edited.error]);
        return false;
      }
      template = edited.template;
    }
    return apply(
      [
        ...payee.mutations,
        {
          name: "upsertRule",
          args: {
            id: rule.id,
            name: draft.name.trim(),
            unit: draft.unit,
            interval,
            weekday: draft.unit === "week" ? day : null,
            dayOfMonth: draft.unit === "week" ? null : day,
            nonBusinessDay: draft.nonBusinessDay,
            endsOn: isValidDay(draft.endsOn) ? draft.endsOn : null,
            autoPost: draft.autoPost && !autoPostBlocked,
            paused: draft.paused,
            ...(sameTemplate(template, rule.template) ? {} : { template }),
          },
        },
      ],
      { message: messages.saved },
    );
  }

  function templateFields(rule: RuleRow): RuleTemplateFieldsDraft {
    const { template } = rule;
    const editable = simpleTemplateAccounts(template, isBase);
    if (!editable) return EMPTY_FIELDS;
    const payee = payees.find((row) => row.id === template.payeeId);
    return {
      kind: template.kind,
      payeeText: payee?.name ?? "",
      payeeId: payee?.id ?? null,
      accountId: editable.accountId,
      toAccountId: editable.toAccountId,
      categoryId: template.categoryId ?? "",
    };
  }

  function openNew() {
    setError(undefined);
    setDraft({
      rule: null,
      fields: EMPTY_FIELDS,
      startsOn: today,
      name: "",
      amount: "",
      unit: "month",
      interval: "1",
      day: "",
      nonBusinessDay: "stay",
      endsOn: "",
      autoPost: false,
      paused: false,
    });
  }

  function openRule(rule: RuleRow) {
    setError(undefined);
    setDraft({
      rule,
      fields: templateFields(rule),
      startsOn: rule.startsOn,
      name: rule.name,
      amount: minorUnitsToDecimalString(
        templateAmount(rule.template),
        templateCurrency(rule),
      ),
      unit: rule.unit,
      interval: String(rule.interval),
      day: scheduleDay(rule),
      nonBusinessDay: rule.nonBusinessDay,
      endsOn: rule.endsOn ?? "",
      autoPost: rule.autoPost,
      paused: rule.pausedAt !== null,
    });
  }

  return {
    draft,
    setDraft,
    error,
    templateEditable,
    autoPostBlocked,
    templateCurrency,
    openNew,
    openRule,
    save,
  };
}

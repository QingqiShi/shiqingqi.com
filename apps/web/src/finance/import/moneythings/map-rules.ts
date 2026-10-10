import { addDays } from "../../domain/dates/add-days.ts";
import { nextOccurrence } from "../../rules/next-occurrence.ts";
import type { RuleTemplate } from "../../rules/rule-template-schema.ts";
import { coreDataDay } from "./core-data-day.ts";
import type { Rounder } from "./create-rounder.ts";
import { importId } from "./import-id.ts";
import type { MappedAccounts } from "./map-accounts.ts";
import type { MappedCategories } from "./map-categories.ts";
import type { MappedPayeesAndTags } from "./map-payees-and-tags.ts";
import type { MapOptions } from "./types.ts";
import type { RuleRow } from "./types.ts";
import type { SourceCrontab, SourceData } from "./types.ts";

type RuleUnit = RuleRow["unit"];

function ruleUnit(unit: string): RuleUnit {
  if (unit === "week" || unit === "month" || unit === "year") return unit;
  throw new Error(`Unsupported schedule unit ${unit}`);
}

interface Context {
  source: SourceData;
  options: MapOptions;
  rounder: Rounder;
  accounts: MappedAccounts;
  categories: MappedCategories;
  payeesAndTags: MappedPayeesAndTags;
}

/**
 * Rules from MoneyThings schedules and their templates. A template without a
 * schedule is dropped. The import keeps the expected rows up to
 * `expectedUntil`, so a rule's next occurrence comes after that day.
 */
export function mapRules(context: Context): RuleRow[] {
  const { source, options, rounder, accounts, categories, payeesAndTags } =
    context;
  const templates = new Map(source.templates.map((t) => [t.id, t]));
  const payeeNames = new Map(payeesAndTags.payees.map((p) => [p.id, p.name]));
  const categoryNames = new Map(categories.rows.map((c) => [c.id, c.name]));
  const owners = new Map(accounts.accounts.map((a) => [a.id, a.ownerMemberId]));

  const rules: RuleRow[] = [];
  for (const crontab of source.crontabs) {
    const template = templates.get(crontab.templateId);
    if (!template) continue;
    const id = importId("rule", crontab.id);
    const minor = (value: number) =>
      rounder.toMinor(value, template.currency, { table: "rules", id });
    const amount = template.amount === null ? 0 : minor(template.amount);
    const category =
      template.categoryId === null
        ? undefined
        : categories.bySourceId.get(template.categoryId);
    const from =
      template.outSubAccountId === null
        ? undefined
        : accounts.accountIdBySubAccount.get(template.outSubAccountId);
    const to =
      template.inSubAccountId === null
        ? undefined
        : accounts.accountIdBySubAccount.get(template.inSubAccountId);
    const kind = to ? "transfer" : (category?.kind ?? "expense");
    const absolute = Math.abs(amount);

    const entries: RuleTemplate["entries"] = [];
    if (from) {
      entries.push({
        accountId: from,
        amountMinor: kind === "transfer" ? -absolute : amount,
      });
    }
    if (to) entries.push({ accountId: to, amountMinor: absolute });
    const linked = [
      ...template.linkedRepayableAccountIds.map((accountId, i) => ({
        accountId,
        amount: template.linkedRepayableAmounts.at(i),
      })),
      ...template.recoverableAccountIds.map((accountId, i) => ({
        accountId,
        amount: template.recoverableAmounts.at(i),
      })),
    ];
    for (const { accountId, amount: linkedAmount } of linked) {
      const ledger = accounts.accountIdByLedgerAccountId.get(accountId);
      if (!ledger) continue;
      entries.push({
        accountId: ledger,
        amountMinor:
          linkedAmount === undefined || Number.isNaN(linkedAmount)
            ? absolute
            : minor(linkedAmount),
      });
    }

    const { payeeId, tagIds } = payeesAndTags.resolve(template.tagIds);
    const memberId = category?.member
      ? options.memberIds[category.member]
      : (owners.get(from ?? "") ?? null);
    if (entries.length === 0) continue;
    const ruleTemplate: RuleTemplate = {
      kind,
      amountMinor: kind === "transfer" ? 0 : amount,
      categoryId: kind === "transfer" ? null : (category?.id ?? null),
      payeeId,
      memberId,
      note: template.remark,
      entries,
      tagIds,
    };

    const unit = ruleUnit(crontab.unit);
    const startsOn = coreDataDay(crontab.beginDate, options.timeZone);
    const dayOfMonth = monthDay(crontab, unit);
    const endsOn =
      crontab.endDate === null
        ? null
        : coreDataDay(crontab.endDate, options.timeZone);
    const schedule = {
      startsOn,
      endsOn,
      unit,
      interval: crontab.interval,
      dayOfMonth,
      weekday: null,
      monthOfYear: null,
    };
    rules.push({
      id,
      householdId: options.householdId,
      name:
        template.name ||
        (payeeId ? payeeNames.get(payeeId) : undefined) ||
        template.remark ||
        (category?.id ? categoryNames.get(category.id) : undefined) ||
        "Rule",
      ...schedule,
      nextOn: nextOccurrence(schedule, addDays(options.expectedUntil, 1)),
      autoPost: !crontab.needsConfirmation,
      template: ruleTemplate,
      pausedAt: crontab.stopped ? options.importedAt : null,
      version: 0,
    });
  }
  return rules;
}

function monthDay(crontab: SourceCrontab, unit: RuleUnit) {
  if (unit !== "month") return null;
  const day = Number.parseInt(crontab.supplementary, 10);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

import { eq } from "drizzle-orm";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { ruleRepository } from "../db/repositories/rule-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import { transactions } from "../db/schema.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { reconciliation } from "../reconciliation/reconciliation.ts";
import { DerivedTouches } from "../sync/derived-touches.ts";
import type { WriteContext } from "../sync/types.ts";
import { nextOccurrence, occurrencesBetween } from "./next-occurrence.ts";
import { occurrenceEntryId, occurrenceId } from "./occurrence-id.ts";
import {
  occurrenceFromTemplate,
  ruleOccurrences,
  withActiveMember,
} from "./rule-occurrences.ts";
import {
  ruleTemplateSchema,
  type RuleTemplate,
} from "./rule-template-schema.ts";

/** How far ahead Expected Transactions appear. */
const MATERIALISE_DAYS_AHEAD = 7;
const MAX_OCCURRENCES_PER_RUN = 400;

type Rule = Awaited<ReturnType<typeof ruleRepository.findDue>>[number];

async function createOccurrence(
  context: WriteContext,
  rule: Rule,
  template: RuleTemplate,
  day: string,
) {
  const { scope, today } = context;
  const id = occurrenceId(rule.id, day);
  const status = rule.autoPost && day <= today ? "posted" : "expected";
  const { entries, tagIds, ...fields } = occurrenceFromTemplate(
    template,
    (position) => occurrenceEntryId(rule.id, day, position),
  );
  const inserted = await transactionRepository.insert(scope, {
    ...fields,
    id,
    status,
    date: day,
    ruleId: rule.id,
    source: "rule",
  });
  if (!inserted) return 0;
  await transactionRepository.replaceEntries(scope, id, day, entries);
  await transactionRepository.replaceTags(scope, id, tagIds);
  await transactionRepository.refreshSearchText(scope, eq(transactions.id, id));
  if (status === "posted") {
    for (const entry of entries) {
      context.touches.account(entry.accountId, day);
    }
  }
  return 1;
}

/**
 * Inside an open write: creates the Expected Transactions of every live Rule
 * up to a week ahead, moves each Rule's `next_on` past them, and posts the
 * ones of `auto_post` Rules that are due. It creates no Transaction for a
 * day that the Rule has a Transaction for already, so running it twice
 * changes nothing. It also creates none for a day that a bank-backed
 * Transaction stands for, for example one that Bank sync made before the
 * Rule existed: it gives that Transaction the Rule instead and changes
 * nothing else, as when Bank sync confirms an Expected Transaction. Returns
 * how many rows it wrote.
 */
export async function materialiseRulesInTransaction(context: WriteContext) {
  const { scope, today } = context;
  const horizon = addDays(today, MATERIALISE_DAYS_AHEAD);
  let written = 0;

  for (const rule of await ruleRepository.findDue(scope, horizon)) {
    const days = occurrencesBetween(rule, rule.nextOn, horizon).slice(
      0,
      MAX_OCCURRENCES_PER_RUN,
    );
    const parsed = ruleTemplateSchema.safeParse(rule.template);
    const template = parsed.success
      ? await withActiveMember(scope, parsed.data)
      : null;
    if (
      days.length > 0 &&
      template &&
      (await ruleOccurrences.isUsable(scope, template))
    ) {
      const holders = await reconciliation.occurrenceHolders(
        scope,
        { id: rule.id, template },
        days,
      );
      for (const day of days) {
        const holder = holders.get(day);
        if (!holder) {
          written += await createOccurrence(context, rule, template, day);
        } else if (holder.kind === "bank" && holder.ruleId === null) {
          await transactionRepository.patch(scope, holder.transactionId, {
            ruleId: rule.id,
          });
          written++;
        }
      }
    }
    const nextOn = nextOccurrence(rule, addDays(days.at(-1) ?? horizon, 1));
    if (nextOn !== rule.nextOn) {
      await ruleRepository.patch(scope, rule.id, { nextOn });
      written++;
    }
  }

  const posted = await transactionRepository.postDueAutoPost(scope, today);
  for (const entry of await transactionRepository.findEntryAccounts(
    scope,
    posted.map((row) => row.id),
  )) {
    context.touches.account(entry.accountId, entry.date);
  }
  return written + posted.length;
}

/**
 * Materialises the Rules of one Household in a write of its own, as the
 * daily cron does. "Today" is the Household's day at `now`.
 */
export async function materialiseRules(
  db: FinanceDb,
  householdId: string,
  now = new Date(),
) {
  return withHousehold(db, householdId, async (scope) => {
    await setStatementTimeout(scope.db);
    const household = await householdRepository.lockForWrite(scope);
    if (!household) throw new Error("Household not found");
    const version = household.clock + 1;
    const context: WriteContext = {
      scope: { ...scope, version },
      today: todayInTimeZone(household.timezone, now),
      touches: new DerivedTouches(),
      actor: "server",
    };
    const written = await materialiseRulesInTransaction(context);
    if (written === 0) return { written, clock: household.clock };
    await recomputeDerived(context.scope, context.touches);
    await householdRepository.setClock(context.scope, version);
    return { written, clock: version };
  });
}

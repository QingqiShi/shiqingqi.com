import { eq } from "drizzle-orm";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { ruleRepository } from "../db/repositories/rule-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { transactions } from "../db/schema.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { DerivedTouches } from "../sync/derived-touches.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type { WriteContext } from "../sync/types.ts";
import { validateTransaction } from "../sync/validate-transaction.ts";
import { nextOccurrence, occurrencesBetween } from "./next-occurrence.ts";
import {
  ruleTemplateSchema,
  type RuleTemplate,
} from "./rule-template-schema.ts";

/** How far ahead Expected Transactions appear. */
const MATERIALISE_DAYS_AHEAD = 7;
const MAX_OCCURRENCES_PER_RUN = 400;

type Rule = Awaited<ReturnType<typeof ruleRepository.findDue>>[number];

/** The id of a Rule's Transaction on a day; the same occurrence always gets the same id. */
export function occurrenceId(ruleId: string, day: string) {
  return nameBasedUuid(`rule:${ruleId}:${day}`);
}

async function isUsable(context: WriteContext, template: RuleTemplate) {
  try {
    await validateTransaction(context.scope, template);
    return true;
  } catch (error) {
    if (error instanceof MutationError) return false;
    throw error;
  }
}

async function createOccurrence(
  context: WriteContext,
  rule: Rule,
  template: RuleTemplate,
  day: string,
) {
  const { scope, today } = context;
  const id = occurrenceId(rule.id, day);
  const status = rule.autoPost && day <= today ? "posted" : "expected";
  const inserted = await transactionRepository.insert(scope, {
    id,
    kind: template.kind,
    status,
    date: day,
    amountMinor: template.amountMinor,
    categoryId: template.categoryId,
    payeeId: template.payeeId,
    memberId: template.memberId,
    ruleId: rule.id,
    note: template.note,
    source: "rule",
  });
  if (!inserted) return 0;
  await transactionRepository.replaceEntries(
    scope,
    id,
    day,
    template.entries.map((entry, index) => ({
      ...entry,
      id: nameBasedUuid(`rule:${rule.id}:${day}:${String(index)}`),
    })),
  );
  await transactionRepository.replaceTags(scope, id, [
    ...new Set(template.tagIds),
  ]);
  await transactionRepository.refreshSearchText(scope, eq(transactions.id, id));
  if (status === "posted") {
    for (const entry of template.entries) {
      context.touches.account(entry.accountId, day);
    }
    context.touches.month(day);
  }
  return 1;
}

/**
 * Inside an open write: creates the Expected Transactions of every live Rule
 * up to a week ahead, moves each Rule's `next_on` past them, and posts the
 * ones of `auto_post` Rules that are due. Running it twice changes nothing.
 * Returns how many rows it wrote.
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
      ? {
          ...parsed.data,
          memberId: await memberRepository.activeIdOrNull(
            scope,
            parsed.data.memberId,
          ),
        }
      : null;
    if (template && (await isUsable(context, template))) {
      for (const day of days) {
        written += await createOccurrence(context, rule, template, day);
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
  for (const row of posted) context.touches.month(row.date);
  return written + posted.length;
}

/**
 * Materialises the Rules of one Household in a write of its own, as the
 * daily cron does. "Today" is the Household's day at `now`.
 */
export async function materialiseRules(
  scope: RepositoryScope,
  now = new Date(),
) {
  return scope.db.transaction(async (db) => {
    await setStatementTimeout(db);
    const household = await householdRepository.lockForWrite({
      db,
      householdId: scope.householdId,
    });
    if (!household) throw new Error("Household not found");
    const version = household.clock + 1;
    const context: WriteContext = {
      scope: { db, householdId: scope.householdId, version },
      today: todayInTimeZone(household.timezone, now),
      touches: new DerivedTouches(),
    };
    const written = await materialiseRulesInTransaction(context);
    if (written === 0) return { written, clock: household.clock };
    await recomputeDerived(db, scope.householdId, context.touches, version);
    await householdRepository.setClock(context.scope, version);
    return { written, clock: version };
  });
}

import { eq } from "drizzle-orm";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import { ruleRepository } from "../db/repositories/rule-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { transactions } from "../db/schema.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { DerivedTouches } from "../sync/derived-touches.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type { WriteContext } from "../sync/types.ts";
import { validateTransaction } from "../sync/validate-transaction.ts";
import { nextOccurrence, occurrencesBetween } from "./next-occurrence.ts";
import { occurrenceFromTemplate } from "./occurrence-from-template.ts";
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

/** The id of the Entry at `position` of a Rule's Transaction on a day. */
export function occurrenceEntryId(
  ruleId: string,
  day: string,
  position: number,
) {
  return nameBasedUuid(`rule:${ruleId}:${day}:${String(position)}`);
}

/** The template with its Member only while that Member is active, as each Transaction of the Rule takes it. */
export async function withActiveMember(
  scope: RepositoryScope,
  template: RuleTemplate,
): Promise<RuleTemplate> {
  return {
    ...template,
    memberId: await memberRepository.activeIdOrNull(scope, template.memberId),
  };
}

/**
 * The days among `days` that a Transaction of the Rule already stands for,
 * live or deleted, whatever its id. A Transaction stands for the day that
 * its id names, so a Transaction that Bank sync moved to the bank row's date
 * still stands for its first day. A Transaction with a different id, for
 * example an imported one, stands for its date.
 */
async function takenDays(
  scope: RepositoryScope,
  ruleId: string,
  days: string[],
) {
  const dayById = new Map(days.map((day) => [occurrenceId(ruleId, day), day]));
  const rows = await transactionRepository.findOfRuleOnDaysOrIds(
    scope,
    ruleId,
    days,
    [...dayById.keys()],
  );
  return new Set(rows.map((row) => dayById.get(row.id) ?? row.date));
}

/** False when the template names a row that a Transaction cannot use, such as a deleted account. */
export async function isUsable(context: WriteContext, template: RuleTemplate) {
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
 * changes nothing. Returns how many rows it wrote.
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
    if (days.length > 0 && template && (await isUsable(context, template))) {
      const taken = await takenDays(scope, rule.id, days);
      for (const day of days) {
        if (taken.has(day)) continue;
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

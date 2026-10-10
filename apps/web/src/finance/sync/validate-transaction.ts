import { accountRepository } from "../db/repositories/account-repository.ts";
import { categoryRepository } from "../db/repositories/category-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import { payeeRepository } from "../db/repositories/payee-repository.ts";
import { ruleRepository } from "../db/repositories/rule-repository.ts";
import { tagRepository } from "../db/repositories/tag-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import {
  checkTransactionShape,
  type TransactionShape,
} from "./check-transaction-shape.ts";
import { MutationError } from "./mutation-error.ts";

function invalid(message: string): never {
  throw new MutationError("invalid", message);
}

/**
 * Checks the rules every Transaction keeps, whoever writes it: a transfer
 * moves money between two different accounts and has no Category; an expense
 * or income has a Category of its own kind; every row it names belongs to
 * the Household. With `previous`, a row the Transaction named before is not
 * checked again, so a Transaction whose Category was deleted can still be
 * edited.
 */
export async function validateTransaction(
  scope: RepositoryScope,
  transaction: TransactionShape,
  previous?: TransactionShape,
) {
  checkTransactionShape(transaction);
  const changed = (key: keyof TransactionShape) =>
    previous === undefined || previous[key] !== transaction[key];

  if (
    transaction.categoryId !== null &&
    (changed("categoryId") || changed("kind"))
  ) {
    const category = await categoryRepository.findById(
      scope,
      transaction.categoryId,
    );
    if (!category || category.deletedAt) invalid("Unknown category");
    if (category.kind !== transaction.kind) {
      invalid(`The category is not an ${transaction.kind} category`);
    }
  }

  const previousAccounts = new Set(
    previous?.entries.map((entry) => entry.accountId),
  );
  const accountIds = transaction.entries
    .map((entry) => entry.accountId)
    .filter((id) => !previousAccounts.has(id));
  const activeAccounts = await accountRepository.findActiveIds(
    scope,
    accountIds,
  );
  if (accountIds.some((id) => !activeAccounts.has(id))) {
    invalid("Unknown account");
  }

  const previousTags = new Set(previous?.tagIds);
  const tagIds = [...new Set(transaction.tagIds)].filter(
    (id) => !previousTags.has(id),
  );
  const activeTags = await tagRepository.findActiveIds(scope, tagIds);
  if (activeTags.size !== tagIds.length) invalid("Unknown tag");

  if (transaction.payeeId !== null && changed("payeeId")) {
    const payee = await payeeRepository.findById(scope, transaction.payeeId);
    if (!payee || payee.deletedAt) invalid("Unknown payee");
  }
  if (transaction.memberId !== null && changed("memberId")) {
    const member = await memberRepository.findById(scope, transaction.memberId);
    if (!member) invalid("Unknown member");
  }
  if (transaction.refundOfId && changed("refundOfId")) {
    const original = await transactionRepository.findById(
      scope,
      transaction.refundOfId,
    );
    if (!original) invalid("Unknown refunded transaction");
  }
  if (transaction.ruleId && changed("ruleId")) {
    const rule = await ruleRepository.findById(scope, transaction.ruleId);
    if (!rule) invalid("Unknown rule");
  }
}

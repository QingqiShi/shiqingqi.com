import { categoryAncestry } from "../domain/category-ancestry.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import type { LabellingContext, RowToLabel } from "./types.ts";

const RULES = `You label bank rows for a household finance app. Each bank row is one movement of money on one of the household's accounts. You decide what it was: the kind, the labels, and for a transfer the account on the other side.

Rules:
1. The date and amount of a bank row are facts. Never doubt or change them.
2. Before you label a row, call search_transactions for it with one or two distinctive words of the bank text, even for a merchant you know: the household's own labels beat what you know about a merchant. Search for many rows at once. Copy the labels of the closest past transactions. When old and recent labels disagree, follow the recent ones. When examples conflict and you cannot tell which is right, flag the row for review.
3. Kinds:
- expense: money spent. Money back from a shop (a refund) is also an expense, with the category of the purchase.
- income: money earned or received, such as salary, interest, a gift or a tax refund.
- transfer: money moved between two of the household's own accounts: to savings, a card repayment, a pot, an ISA. A transfer has no category and no payee. A card repayment goes from the card's default payment account to the card, usually near its payment due day.
- Paying a person, or money from a person, is an expense or an income with that person as the payee, unless the instructions say otherwise.
4. For a transfer, say where the other side is, with exactly one of: transferAccountId, when you know the other account; pairRef, when another row of this batch is the other side (the opposite amount on another account, usually within a few days); transferUnknown, when the money went to or came from an account of the household that you cannot identify. Never use the row's own account.
5. paysDownAccountId: for an expense or an income that also changes a loan or money owed (a mortgage payment, an instalment, a friend paying back), the loan or receivable account, when past transactions show an extra entry on that account. Otherwise null.
6. needsReview: true only when a person should look: you guessed with little evidence, the examples conflict, or something looks wrong. reason: one short line that says why you chose these labels, or why the row needs a look. Write it in the language of the household's instructions, or in English when there are none.
7. Use only ids from the lists below or from search results. Payee: for an expense or an income, always give the payee when the bank text names a merchant or a person, for every such row ("TFL TRAVEL CHARGE" is TfL, "UBER *TRIP" is Uber), also when the past transactions have none. Look in the payee list first: give payeeId when a known payee is the same merchant or person, also when the bank text writes its name differently. Never make a second payee for a merchant that is in the list. Else newPayeeName: a short name in normal capitalisation ("Tesco", "Deliveroo", "TfL"). For a delivery platform or marketplace, name the platform. Never include store numbers, card numbers, towns or reference codes. Leave the payee empty only when the bank text names nobody, such as a bare reference number. memberId: the member who made the transaction, when the examples or the account owner show it; else null. tagIds: only when examples show that the household tags such transactions; usually empty. note: empty, unless it says something that the labels do not.
8. Answer every row exactly once, with its ref.`;

/** The path of a Category, "Food > Groceries". */
export function categoryPathOf(context: LabellingContext) {
  const byId = new Map(
    context.categories.map((category) => [category.id, category]),
  );
  return (categoryId: string) =>
    categoryAncestry(categoryId, byId)
      .map((category) => category.name)
      .join(" > ");
}

function accountLines(context: LabellingContext) {
  const names = new Map(
    context.accounts.map((account) => [account.id, account.name]),
  );
  const memberNames = new Map(
    context.members.map((member) => [member.id, member.name]),
  );
  return context.accounts
    .filter((account) => !account.isSystem)
    .map((account) => {
      const flags = [
        account.linked ? "linked (its own bank rows arrive)" : "not linked",
        account.closed ? "closed" : "",
        account.defaultPaymentAccountId
          ? `paid from ${names.get(account.defaultPaymentAccountId) ?? "?"}`
          : "",
        account.paymentDueDay === null
          ? ""
          : `payment due day ${String(account.paymentDueDay)}`,
      ].filter(Boolean);
      const owner = account.ownerMemberId
        ? (memberNames.get(account.ownerMemberId) ?? "?")
        : "shared";
      return `${account.id} | ${account.name} | ${account.institution || "-"} | ${account.kind} | ${account.currency} | ${owner} | ${flags.join(", ")}`;
    })
    .join("\n");
}

/** The part of the prompt that stays the same for a Household between calls, so the provider can cache it. */
export function labellerSystemPrompt(context: LabellingContext) {
  const pathOf = categoryPathOf(context);
  const categories = context.categories
    .map(
      (category) =>
        `${category.id} | ${category.kind} | ${pathOf(category.id)}`,
    )
    .join("\n");
  const tags =
    context.tags.map((tag) => `${tag.id} | ${tag.name}`).join("\n") || "(none)";
  const members =
    context.members
      .map((member) => `${member.id} | ${member.name}`)
      .join("\n") || "(none)";
  const payees =
    context.payees
      .map((payee) =>
        payee.defaultCategoryId
          ? `${payee.id} | ${payee.name} → ${pathOf(payee.defaultCategoryId)}`
          : `${payee.id} | ${payee.name}`,
      )
      .join("\n") || "(none)";
  const instructions = context.instructions.trim() || "(none)";
  return `${RULES}

The household's instructions. They override the rules above:
<instructions>
${instructions}
</instructions>

Base currency: ${context.baseCurrency}

Accounts (id | name | institution | kind | currency | owner | notes):
${accountLines(context)}

Categories (id | kind | path):
${categories}

Tags (id | name):
${tags}

Members (id | name):
${members}

Payees, most recently used first (id | name → usual category):
${payees}`;
}

/** One line per bank row. */
export function describeRows(
  rows: readonly RowToLabel[],
  context: LabellingContext,
) {
  const accounts = new Map(
    context.accounts.map((account) => [account.id, account]),
  );
  const lines = rows.map((row) => {
    const account = accounts.get(row.accountId);
    const currency = account?.currency ?? context.baseCurrency;
    return [
      `#${row.ref}`,
      row.date,
      `${minorUnitsToDecimalString(row.amountMinor, currency)} ${currency}`,
      `${account?.name ?? "?"} (${row.accountId})`,
      row.merchant || "-",
      row.description || "-",
    ].join(" | ");
  });
  return `Bank rows to label (ref | date | amount | account (id) | merchant | description):
${lines.join("\n")}

Answer all ${String(rows.length)} rows.`;
}

import type { FoundTransaction } from "../../db/repositories/transaction-search-repository.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import type { LabellingContext, RowToLabel } from "../types.ts";

/**
 * An invented Household with two bank rows to label: one with similar past
 * Transactions, and one that an instruction speaks of, with none.
 */
const id = (key: string) => nameBasedUuid(`eval:${key}`);

const tree: Record<"expense" | "income", Record<string, string[]>> = {
  expense: {
    Home: ["Rent", "Energy", "Water", "Internet", "Cleaning"],
    Food: ["Groceries", "Eating out", "Takeaway"],
    Travel: ["Commute", "Day trips", "Holidays"],
    Entertainment: ["Games", "Streaming", "Cinema"],
    Spending: ["Hobbies", "Clothes", "Gifts"],
    Social: ["Treats", "Donations"],
  },
  income: { Salary: [], Interest: [], Other: [] },
};

/** Category paths, "Spending > Hobbies", by id. */
const categoryPaths = new Map<string, string>();
const categories: LabellingContext["categories"][number][] = [];
for (const kind of ["expense", "income"] as const) {
  for (const [parent, children] of Object.entries(tree[kind])) {
    const parentId = id(`category:${parent}`);
    categoryPaths.set(parentId, parent);
    categories.push({
      id: parentId,
      parentId: null,
      kind,
      name: parent,
      isSystem: false,
      usualPayees: [],
    });
    for (const child of children) {
      const childId = id(`category:${parent} > ${child}`);
      categoryPaths.set(childId, `${parent} > ${child}`);
      categories.push({
        id: childId,
        parentId,
        kind,
        name: child,
        isSystem: false,
        usualPayees: [],
      });
    }
  }
}

const alex = id("member:Alex");
const sam = id("member:Sam");
const creditCard = id("account:Credit card");
const pixelforge = id("payee:Pixelforge");
const hobbies = id("category:Spending > Hobbies");

const account = {
  institution: "",
  closed: false,
  isSystem: false,
  defaultPaymentAccountId: null,
  paymentDueDay: null,
  currency: "GBP",
};

const context: LabellingContext = {
  baseCurrency: "GBP",
  instructions: `- RIVERLINE TRANSIT on a Saturday or Sunday is Travel > Day trips, tag Train. On a weekday it is Travel > Commute, tag Train.
- Payments to K PATEL are our cleaner: Home > Cleaning.`,
  accounts: [
    {
      ...account,
      id: id("account:Current account"),
      name: "Current account",
      kind: "cash",
      ownerMemberId: alex,
      linked: true,
    },
    {
      ...account,
      id: creditCard,
      name: "Credit card",
      kind: "credit",
      ownerMemberId: alex,
      linked: true,
      paymentDueDay: 15,
    },
    {
      ...account,
      id: id("account:Savings"),
      name: "Savings",
      kind: "cash",
      ownerMemberId: sam,
      linked: true,
    },
    {
      ...account,
      id: id("account:Mortgage"),
      name: "Mortgage",
      kind: "loan",
      ownerMemberId: null,
      linked: false,
    },
  ],
  categories,
  tags: ["Train", "Bus", "Taxi", "Flight", "Weekend"].map((name) => ({
    id: id(`tag:${name}`),
    name,
  })),
  members: [
    { id: alex, name: "Alex" },
    { id: sam, name: "Sam" },
  ],
  payees: [{ id: pixelforge, name: "Pixelforge", defaultCategoryId: null }],
};

const PIXELFORGE_TEXT = "PAYPAL *PIXELFORGE  0800123456";

function pastPixelforge(
  date: string,
  amountMinor: number,
  note: string,
): FoundTransaction {
  return {
    id: id(`past:${date}`),
    date,
    kind: "expense",
    labelledBy: "member",
    entries: [
      {
        accountId: creditCard,
        accountName: "Credit card",
        amountMinor,
        currency: "GBP",
      },
    ],
    bankTexts: [PIXELFORGE_TEXT],
    payeeId: pixelforge,
    payeeName: "Pixelforge",
    categoryId: hobbies,
    tagNames: [],
    memberName: "Alex",
    note,
  };
}

export interface EvalCase {
  row: RowToLabel;
  past: FoundTransaction[];
  category: string;
  tags: string[];
}

const withPast: EvalCase = {
  row: {
    ref: "with-past",
    date: "2026-03-12",
    amountMinor: -2499,
    accountId: creditCard,
    merchant: "PAYPAL *PIXELFORGE",
    description: PIXELFORGE_TEXT,
  },
  past: [
    pastPixelforge("2026-02-20", -1299, "game"),
    pastPixelforge("2026-01-31", -3999, "expansion pack"),
    pastPixelforge("2026-01-09", -849, "game"),
  ],
  category: "Spending > Hobbies",
  tags: [],
};

const withInstruction: EvalCase = {
  row: {
    ref: "with-instruction",
    date: "2026-03-15",
    amountMinor: -840,
    accountId: creditCard,
    merchant: "RIVERLINE TRANSIT",
    description: "RIVERLINE TRANSIT FARES",
  },
  past: [],
  category: "Travel > Day trips",
  tags: ["Train"],
};

export const categoriseFixture = {
  context,
  categoryPaths,
  withPast,
  withInstruction,
};

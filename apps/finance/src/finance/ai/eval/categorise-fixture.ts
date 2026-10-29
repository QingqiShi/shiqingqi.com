import type { FoundTransaction } from "../../db/repositories/transaction-search-repository.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import type { LabellingContext, RowToLabel } from "../types.ts";

/**
 * An invented Household with bank rows to label: one with similar past
 * Transactions, one that an instruction speaks of, with none, and rows whose
 * kind is the question.
 */
const id = (key: string) => nameBasedUuid(`eval:${key}`);

const tree: Record<"expense" | "income", Record<string, string[]>> = {
  expense: {
    Home: ["Rent", "Energy", "Water", "Internet", "Cleaning"],
    Food: ["Groceries", "Eating out", "Takeaway"],
    Travel: ["Commute", "Day trips", "Holidays"],
    Entertainment: ["Games", "Streaming", "Cinema", "Subscriptions"],
    Spending: ["Hobbies", "Clothes", "Gifts", "Electronics"],
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
const currentAccount = id("account:Current account");
const creditCard = id("account:Credit card");
const jointAccount = id("account:Joint account");
const pixelforge = id("payee:Pixelforge");
const icloud = id("payee:iCloud");
const apple = id("payee:Apple");
const amazon = id("payee:Amazon");
const hobbies = id("category:Spending > Hobbies");
const subscriptions = id("category:Entertainment > Subscriptions");
const games = id("category:Entertainment > Games");
const clothes = id("category:Spending > Clothes");

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
- Payments to K PATEL are our cleaner: Home > Cleaning.
- Every transaction on Credit card and Current account, including transfers, is Alex's unless the examples show it is for Sam.
- APPLE.COM/BILL is the payee iCloud.`,
  accounts: [
    {
      ...account,
      id: currentAccount,
      name: "Current account",
      kind: "cash",
      ownerMemberId: alex,
      linked: true,
    },
    {
      ...account,
      id: creditCard,
      name: "Credit card",
      institution: "Harbour Card",
      kind: "credit",
      ownerMemberId: alex,
      linked: true,
      defaultPaymentAccountId: currentAccount,
      paymentDueDay: 22,
    },
    {
      ...account,
      id: jointAccount,
      name: "Joint account",
      kind: "cash",
      ownerMemberId: null,
      linked: true,
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
  payees: [
    { id: pixelforge, name: "Pixelforge", defaultCategoryId: null },
    { id: icloud, name: "iCloud", defaultCategoryId: subscriptions },
    { id: apple, name: "Apple", defaultCategoryId: null },
    { id: amazon, name: "Amazon", defaultCategoryId: null },
  ],
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

export interface LabelCase {
  row: RowToLabel;
  past: FoundTransaction[];
}

export interface EvalCase extends LabelCase {
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

interface PastExpense {
  date: string;
  accountId: string;
  amountMinor: number;
  bankText: string;
  payeeId: string;
  categoryId: string;
  labelledBy?: FoundTransaction["labelledBy"];
}

function nameOf(
  named: readonly { id: string; name: string }[],
  wanted: string,
) {
  const found = named.find((each) => each.id === wanted);
  if (!found) throw new Error(`Unknown id ${wanted}`);
  return found.name;
}

function pastExpense(past: PastExpense): FoundTransaction {
  const accountName = nameOf(context.accounts, past.accountId);
  return {
    id: id(`past:${past.date}:${past.bankText}`),
    date: past.date,
    kind: "expense",
    labelledBy: past.labelledBy ?? "member",
    entries: [
      {
        accountId: past.accountId,
        accountName,
        amountMinor: past.amountMinor,
        currency: "GBP",
      },
    ],
    bankTexts: [past.bankText],
    payeeId: past.payeeId,
    payeeName: nameOf(context.payees, past.payeeId),
    categoryId: past.categoryId,
    tagNames: [],
    memberName: "Alex",
    note: "",
  };
}

export interface KindCase extends LabelCase {
  kind: "expense" | "income" | "transfer";
  /** The account on the other side, for a transfer. */
  transferAccountId?: string;
}

/** The household's past expenses at Apple and Amazon, newest first. */
const applePast: [
  date: string,
  accountId: string,
  amountMinor: number,
  bankText: string,
  payeeId: string,
  categoryId: string,
  labelledBy?: FoundTransaction["labelledBy"],
][] = [
  [
    "2026-10-12",
    creditCard,
    -10120,
    "AMAZON CO UK RETAIL | AMAZON.CO.UK RETAIL      LONDON",
    amazon,
    clothes,
  ],
  [
    "2026-10-03",
    creditCard,
    -2699,
    "APPLE.COM/BILL | APPLE.COM/BILL         CORK",
    icloud,
    subscriptions,
  ],
  [
    "2026-09-27",
    creditCard,
    -3450,
    "AMAZON CO UK RETAIL | AMAZON.CO.UK RETAIL      LONDON",
    amazon,
    hobbies,
  ],
  [
    "2026-09-18",
    jointAccount,
    -299,
    "APPLE.COM/BILL | ITUNES.COM",
    apple,
    games,
  ],
  [
    "2026-09-02",
    jointAccount,
    -99,
    "APPLE.COM/BILL | ITUNES.COM",
    apple,
    games,
  ],
  [
    "2026-08-25",
    jointAccount,
    -999,
    "APPLE.COM/BILL | APPLE FITNESS+",
    apple,
    subscriptions,
  ],
  [
    "2026-08-11",
    jointAccount,
    -699,
    "APPLE.COM/BILL | APPLE.COM/BILL",
    apple,
    subscriptions,
    "ai",
  ],
  [
    "2026-07-30",
    jointAccount,
    -499,
    "APPLE.COM/BILL | ITUNES.COM",
    apple,
    games,
  ],
];

/** A large purchase on a card a few days after its payment due day, with only small expenses of the same merchants in the past. */
const cardPurchaseAfterDueDay: KindCase = {
  row: {
    ref: "card-purchase-after-due-day",
    date: "2026-10-27",
    amountMinor: -149900,
    accountId: creditCard,
    merchant: "APPLE RETAIL",
    description: "APPLE.COM/UK            LONDON",
  },
  past: applePast.map(
    ([
      date,
      accountId,
      amountMinor,
      bankText,
      payeeId,
      categoryId,
      labelledBy,
    ]) =>
      pastExpense({
        date,
        accountId,
        amountMinor,
        bankText,
        payeeId,
        categoryId,
        labelledBy,
      }),
  ),
  kind: "expense",
};

const CARD_REPAYMENT_MINOR = 84217;

/** The card's repayment as the current account that pays it shows it. */
const cardRepaymentOut: KindCase = {
  row: {
    ref: "card-repayment-out",
    date: "2026-10-21",
    amountMinor: -CARD_REPAYMENT_MINOR,
    accountId: currentAccount,
    merchant: "",
    description: "HARBOUR CARD DIRECT DEBIT",
  },
  past: [],
  kind: "transfer",
  transferAccountId: creditCard,
};

/** The same repayment as the card shows it. */
const cardRepaymentIn: KindCase = {
  row: {
    ref: "card-repayment-in",
    date: "2026-10-22",
    amountMinor: CARD_REPAYMENT_MINOR,
    accountId: creditCard,
    merchant: "",
    description: "PAYMENT RECEIVED - THANK YOU",
  },
  past: [],
  kind: "transfer",
  transferAccountId: currentAccount,
};

const paymentToPerson: KindCase = {
  row: {
    ref: "payment-to-person",
    date: "2026-10-14",
    amountMinor: -6000,
    accountId: currentAccount,
    merchant: "",
    description: "T OKONJO FASTER PAYMENT",
  },
  past: [],
  kind: "expense",
};

export const categoriseFixture = {
  context,
  categoryPaths,
  withPast,
  withInstruction,
  cardPurchaseAfterDueDay,
  kindCases: [cardRepaymentOut, cardRepaymentIn, paymentToPerson],
};

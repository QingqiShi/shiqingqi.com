import type { accountKind } from "../../db/schema.ts";
import type { GroupKey } from "../../import/moneythings/assign-group.ts";

export type SyntheticOwner = "alex" | "sam" | null;

export interface SyntheticAccount {
  key: string;
  name: string;
  institution: string;
  kind: (typeof accountKind.enumValues)[number];
  group: GroupKey;
  currency: "GBP" | "USD";
  owner: SyntheticOwner;
  /** The balance on the day before the history starts, in pounds (or dollars). */
  opening?: number;
  creditLimit?: number;
  statementDay?: number;
  paymentDueDay?: number;
  /** The key of the account that pays this card. */
  paidBy?: string;
  excludedFromNetWorth?: boolean;
  /** Valuation-driven accounts: monthly growth as mean and standard deviation. */
  growth?: { mean: number; spread: number };
  /** Paid in by the employer and the member each month, in pounds. */
  monthlyContribution?: number;
}

export const SYNTHETIC_ACCOUNTS: readonly SyntheticAccount[] = [
  {
    key: "alexCurrent",
    name: "Alex Current",
    institution: "Northbank",
    kind: "cash",
    group: "liquid",
    currency: "GBP",
    owner: "alex",
    opening: 4200,
  },
  {
    key: "samCurrent",
    name: "Sam Current",
    institution: "Harbour Bank",
    kind: "cash",
    group: "liquid",
    currency: "GBP",
    owner: "sam",
    opening: 2600,
  },
  {
    key: "savings",
    name: "Rainy Day Savings",
    institution: "Harbour Bank",
    kind: "cash",
    group: "liquid",
    currency: "GBP",
    owner: null,
    opening: 18_500,
  },
  {
    key: "oldCurrent",
    name: "Old Current Account",
    institution: "Citywide Trust",
    kind: "cash",
    group: "liquid",
    currency: "GBP",
    owner: "alex",
    opening: 3500,
  },
  {
    key: "workExpenses",
    name: "Work Expenses",
    institution: "Northbank",
    kind: "cash",
    group: "liquid",
    currency: "GBP",
    owner: "alex",
    opening: 1000,
    excludedFromNetWorth: true,
  },

  {
    key: "visa",
    name: "Alex Visa",
    institution: "Northbank",
    kind: "credit",
    group: "credit",
    currency: "GBP",
    owner: "alex",
    creditLimit: 8000,
    statementDay: 12,
    paymentDueDay: 5,
    paidBy: "alexCurrent",
  },
  {
    key: "mastercard",
    name: "Sam Mastercard",
    institution: "Harbour Bank",
    kind: "credit",
    group: "credit",
    currency: "GBP",
    owner: "sam",
    creditLimit: 6000,
    statementDay: 20,
    paymentDueDay: 5,
    paidBy: "samCurrent",
  },
  {
    key: "amex",
    name: "Amex Gold",
    institution: "Summit Card Services",
    kind: "credit",
    group: "credit",
    currency: "GBP",
    owner: null,
    creditLimit: 12_000,
    statementDay: 25,
    paymentDueDay: 5,
    paidBy: "samCurrent",
  },

  {
    key: "alexIsa",
    name: "Alex Stocks ISA",
    institution: "Evergreen Invest",
    kind: "investment",
    group: "investments",
    currency: "GBP",
    owner: "alex",
    opening: 24_000,
    growth: { mean: 0.006, spread: 0.035 },
  },
  {
    key: "samIsa",
    name: "Sam Stocks ISA",
    institution: "Evergreen Invest",
    kind: "investment",
    group: "investments",
    currency: "GBP",
    owner: "sam",
    opening: 11_000,
    growth: { mean: 0.006, spread: 0.035 },
  },
  {
    key: "gia",
    name: "Index GIA",
    institution: "Evergreen Invest",
    kind: "investment",
    group: "investments",
    currency: "GBP",
    owner: null,
    opening: 9500,
    growth: { mean: 0.006, spread: 0.03 },
  },
  {
    key: "usBrokerage",
    name: "US Brokerage",
    institution: "Atlas Brokerage",
    kind: "investment",
    group: "investments",
    currency: "USD",
    owner: "alex",
    opening: 18_000,
    growth: { mean: 0.008, spread: 0.045 },
  },
  {
    key: "alexPension",
    name: "Alex Workplace Pension",
    institution: "Summit Pensions",
    kind: "investment",
    group: "retirement",
    currency: "GBP",
    owner: "alex",
    opening: 62_000,
    growth: { mean: 0.005, spread: 0.025 },
    monthlyContribution: 450,
  },
  {
    key: "samPension",
    name: "Sam SIPP",
    institution: "Summit Pensions",
    kind: "investment",
    group: "retirement",
    currency: "GBP",
    owner: "sam",
    opening: 28_000,
    growth: { mean: 0.005, spread: 0.025 },
    monthlyContribution: 300,
  },

  {
    key: "house",
    name: "Family Home",
    institution: "",
    kind: "property",
    group: "property",
    currency: "GBP",
    owner: null,
    opening: 465_000,
    growth: { mean: 0.0025, spread: 0.006 },
  },
  {
    key: "mortgage",
    name: "Home Mortgage",
    institution: "Northbank",
    kind: "loan",
    group: "propertyDebt",
    currency: "GBP",
    owner: null,
    opening: -285_000,
  },
  {
    key: "lent",
    name: "Lent to Friend",
    institution: "",
    kind: "receivable",
    group: "otherAssets",
    currency: "GBP",
    owner: null,
    opening: 1200,
  },
];

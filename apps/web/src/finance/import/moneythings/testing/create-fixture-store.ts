import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { dateToCoreData } from "../core-data-day.ts";
import type { SourceManifest } from "../types.ts";

const TABLES = `
create table ZMTSCENE (Z_PK integer primary key, ZSCENEID varchar, ZSCENENAME varchar);
create table ZMTACCOUNT (Z_PK integer primary key, ZACCOUNTID varchar, ZACCOUNTNAME varchar, ZASSETTYPE varchar, ZNOTCOUNTED integer, ZNOLONGERUSED integer, ZORDER integer, ZINSTALMENTID varchar);
create table ZMTSUBACCOUNT (Z_PK integer primary key, Z_ENT integer, ZSUBACCOUNTID varchar, ZACCOUNT integer, ZSUBACCOUNTNAME varchar, ZCURRENCYCODE varchar, ZCURRENCYAMOUNT decimal, ZACTIVATIONTIME timestamp, ZNOTCOUNTED integer, ZNOLONGERUSED integer, ZORDER integer, ZCREDITLIMIT decimal, ZSTATEMENTDATE timestamp, ZPAYMENTDUEDATE timestamp, ZPAYMENTSUBACCOUNTID varchar, ZTRANSACTIONID varchar, ZTRANSACTIONID1 varchar, ZREMARK varchar);
create table ZMTSUBACCOUNTMODIFYAMOUNTLOG (Z_PK integer primary key, ZLOGID varchar, ZSUBACCOUNT integer, ZACTIVATIONTIME timestamp, ZCURRENCYAMOUNT decimal);
create table ZMTTRANSACTION (Z_PK integer primary key, ZTRANSACTIONID varchar, ZTRANSACTIONTYPE integer, ZPENDING integer, ZFLOWTIME timestamp, ZACCOUNTID varchar, ZSUBACCOUNTID varchar, ZCURRENCYCODE varchar, ZAMOUNT decimal, ZACCOUNTCURRENCYAMOUNT decimal, ZACCOUNTCURRENCYEXCHANGERATE decimal, ZCATEGORYID varchar, ZTAGIDS varchar, ZREMARK varchar, ZTRANSFERTRANSACTIONID varchar, ZREFUNDTRANSACTIONID varchar, ZCRONID varchar);
create table ZMTCATEGORY (Z_PK integer primary key, Z_ENT integer, ZCATEGORYID varchar, ZCATEGORYNAME varchar, ZTYPE varchar, ZPRIMARYCATEGORY integer, ZNOLONGERUSED integer, ZNOTCOUNTED integer, ZORDER integer, ZEMOJI varchar, ZCOLOR varchar);
create table ZMTTAGTYPE (Z_PK integer primary key, ZTYPENAME varchar, ZORDER integer);
create table ZMTTAG (Z_PK integer primary key, ZTAGID varchar, ZTAGNAME varchar, ZTYPE integer, ZORDER integer);
create table ZMTCURRENCYEXCHANGERATE (Z_PK integer primary key, ZRATEID varchar, ZSYMBOL varchar, ZPRICE decimal, ZUPDATETIME timestamp);
create table ZMTONETOUCHITEM (Z_PK integer primary key, ZONETOUCHITEMID varchar, ZNAME varchar, ZAMOUNT decimal, ZCURRENCYCODE varchar, ZCATEGORYID varchar, ZTRANSFEROUTSUBACCOUNTID varchar, ZTRANSFERINSUBACCOUNTID varchar, ZTAGIDS varchar, ZREMARK varchar, ZLINKEDREPAYABLEACCOUNTIDS varchar, ZLINKEDREPAYABLEACCOUNTAMOUNTS varchar, ZRECOVERABLEACCOUNTIDS varchar, ZRECOVERABLEACCOUNTAMOUNTS varchar);
create table ZMTONETOUCHCRONTAB (Z_PK integer primary key, ZCRONID varchar, ZONETOUCHITEMID varchar, ZUNIT varchar, ZINTERVAL integer, ZSUPPLEMENTARY varchar, ZBEGINDATE timestamp, ZSTOPPED integer, ZNEEDSCONFIRMATION integer, ZENDDATE timestamp);
`;

/** Core Data seconds of an ISO time (the fixture uses GMT months, so UTC is London time). */
export function cd(iso: string): number {
  return dateToCoreData(new Date(iso));
}

export const FIXTURE_MANIFEST: SourceManifest = {
  format: "com.lishaohui.moneythings.full-backup",
  version: 2,
  createdAt: "2026-02-20T21:00:00Z",
};

/** "1970 = from the start" in Core Data seconds. */
export const SINCE_THE_START = -978307200;

/**
 * Synthetic ids and names used by the fixture: no real data. The household
 * has a current account, a CNY wallet, a card, a house, a closed account, a
 * mortgage ledger, a lending ledger and a not-counted instalment plan.
 */
export const IDS = {
  scene: "SCENE",
  bank: "ACC-BANK",
  bankSub: "SUB-BANK",
  wallet: "ACC-WALLET",
  walletSub: "SUB-WALLET",
  card: "ACC-CARD",
  cardSub: "SUB-CARD",
  house: "ACC-HOUSE",
  houseSub: "SUB-HOUSE",
  old: "ACC-OLD",
  oldSub: "SUB-OLD",
  mortgage: "ACC-MORTGAGE",
  lending: "ACC-LENDING",
  instalment: "ACC-INSTALMENT",
  life: "CAT-LIFE",
  grocery: "CAT-GROCERY",
  wifeSpend: "CAT-WIFE",
  salary: "CAT-SALARY",
  refund: "CAT-REFUND",
  otherIncome: "CAT-OTHER-INCOME",
  ownTransfer: "CAT-TRANSFER",
  restaurant: "TAG-RESTAURANT",
  delivery: "TAG-DELIVERY",
  train: "TAG-TRAIN",
  template: "TEMPLATE",
  orphanTemplate: "TEMPLATE-ORPHAN",
  cron: "CRON",
} as const;

function insert(
  db: DatabaseSync,
  table: string,
  row: Record<string, SQLInputValue>,
) {
  const columns = Object.keys(row);
  db.prepare(
    `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})`,
  ).run(...Object.values(row));
}

let transactionPk = 0;

function transaction(
  db: DatabaseSync,
  row: {
    id: string;
    type: number;
    time: string;
    sub: string;
    account: string;
    amount: number;
    accountAmount?: number;
    currency?: string;
    rate?: number;
    category?: string | null;
    tags?: string;
    remark?: string;
    transfer?: string;
    refund?: string;
    pending?: number;
    cron?: string;
  },
) {
  insert(db, "ZMTTRANSACTION", {
    Z_PK: ++transactionPk,
    ZTRANSACTIONID: row.id,
    ZTRANSACTIONTYPE: row.type,
    ZPENDING: row.pending ?? 0,
    ZFLOWTIME: cd(row.time),
    ZACCOUNTID: row.account,
    ZSUBACCOUNTID: row.sub,
    ZCURRENCYCODE: row.currency ?? "GBP",
    ZAMOUNT: row.amount,
    ZACCOUNTCURRENCYAMOUNT: row.accountAmount ?? row.amount,
    ZACCOUNTCURRENCYEXCHANGERATE: row.rate ?? 1,
    ZCATEGORYID: row.category ?? null,
    ZTAGIDS: row.tags ?? null,
    ZREMARK: row.remark ?? "",
    ZTRANSFERTRANSACTIONID: row.transfer ?? null,
    ZREFUNDTRANSACTIONID: row.refund ?? null,
    ZCRONID: row.cron ?? null,
  });
}

/** A small MoneyThings store with synthetic rows that exercise every mapping rule. */
export function createFixtureStore(
  path = ":memory:",
  options: { writeAheadLog?: boolean } = {},
): DatabaseSync {
  transactionPk = 0;
  const db = new DatabaseSync(path);
  if (options.writeAheadLog) {
    db.exec("pragma journal_mode = wal; pragma wal_autocheckpoint = 0;");
  }
  db.exec(TABLES);
  insert(db, "ZMTSCENE", { Z_PK: 1, ZSCENEID: IDS.scene, ZSCENENAME: "Home" });

  const accounts: [
    number,
    string,
    string,
    string,
    number,
    number,
    number,
    string | null,
  ][] = [
    [1, IDS.bank, "老公 Bank", "Savings Account", 0, 0, 0, null],
    [2, IDS.wallet, "老公 Wallet", "Savings Account", 0, 0, 1, null],
    [3, IDS.card, "老婆 Card", "Credit Account", 0, 0, 0, null],
    [4, IDS.house, "Cottage", "Investment Account", 0, 0, 0, null],
    [5, IDS.old, "老婆Old Bank", "Savings Account", 0, 1, 2, null],
    [6, IDS.mortgage, "Mortgage", "Repayable Account", 0, 0, 0, null],
    [7, IDS.lending, "Loans to friends", "Recoverable Account", 0, 0, 0, null],
    [
      8,
      IDS.instalment,
      "Instalments - Laptop",
      "Repayable Account",
      1,
      0,
      1,
      "INSTALMENT",
    ],
  ];
  for (const [
    pk,
    id,
    name,
    type,
    notCounted,
    noLongerUsed,
    order,
    instalment,
  ] of accounts) {
    insert(db, "ZMTACCOUNT", {
      Z_PK: pk,
      ZACCOUNTID: id,
      ZACCOUNTNAME: name,
      ZASSETTYPE: type,
      ZNOTCOUNTED: notCounted,
      ZNOLONGERUSED: noLongerUsed,
      ZORDER: order,
      ZINSTALMENTID: instalment,
    });
  }

  const subAccount = (row: Record<string, SQLInputValue>) => {
    insert(db, "ZMTSUBACCOUNT", {
      ZNOTCOUNTED: 0,
      ZNOLONGERUSED: 0,
      ZORDER: 0,
      ZCURRENCYCODE: "GBP",
      ZREMARK: "",
      ...row,
    });
  };
  subAccount({
    Z_PK: 1,
    Z_ENT: 25,
    ZSUBACCOUNTID: IDS.bankSub,
    ZACCOUNT: 1,
    ZSUBACCOUNTNAME: "老公 Bank",
    ZCURRENCYAMOUNT: 800,
    ZACTIVATIONTIME: cd("2026-01-08T10:00:00Z"),
  });
  subAccount({
    Z_PK: 2,
    Z_ENT: 25,
    ZSUBACCOUNTID: IDS.walletSub,
    ZACCOUNT: 2,
    ZSUBACCOUNTNAME: "未命名的储蓄账户",
    ZCURRENCYCODE: "CNY",
    ZCURRENCYAMOUNT: 1000,
    ZACTIVATIONTIME: cd("2026-01-01T09:00:00Z"),
  });
  subAccount({
    Z_PK: 3,
    Z_ENT: 21,
    ZSUBACCOUNTID: IDS.cardSub,
    ZACCOUNT: 3,
    ZSUBACCOUNTNAME: "老婆 Card",
    ZCURRENCYAMOUNT: 0,
    ZACTIVATIONTIME: SINCE_THE_START,
    ZCREDITLIMIT: 1000,
    ZSTATEMENTDATE: cd("2026-01-04T00:00:00Z"),
    ZPAYMENTDUEDATE: cd("2026-01-22T00:00:00Z"),
    ZPAYMENTSUBACCOUNTID: IDS.bankSub,
  });
  subAccount({
    Z_PK: 4,
    Z_ENT: 22,
    ZSUBACCOUNTID: IDS.houseSub,
    ZACCOUNT: 4,
    ZSUBACCOUNTNAME: "Cottage",
    ZCURRENCYAMOUNT: 300000,
    ZACTIVATIONTIME: cd("2026-01-01T12:00:00Z"),
  });
  subAccount({
    Z_PK: 5,
    Z_ENT: 25,
    ZSUBACCOUNTID: IDS.oldSub,
    ZACCOUNT: 5,
    ZSUBACCOUNTNAME: "老婆Old Bank",
    ZCURRENCYAMOUNT: 0,
    ZACTIVATIONTIME: cd("2026-01-05T12:00:00Z"),
  });
  const ledger: [
    number,
    number,
    string,
    number,
    string,
    string | null,
    string | null,
  ][] = [
    [10, 6, "LEDGER-M1", -1000, "2026-01-01T12:00:00Z", null, null],
    [11, 6, "LEDGER-M2", 100, "2026-01-05T08:00:00Z", null, "TX-MORTGAGE"],
    [12, 6, "LEDGER-M3", -5.5, "2026-01-10T08:00:00Z", null, null],
    [13, 6, "LEDGER-M4", 100, "2026-03-01T08:00:00Z", null, "TX-PENDING-NEAR"],
    [14, 6, "LEDGER-M5", 100, "2026-06-01T08:00:00Z", null, "TX-PENDING-FAR"],
    [15, 7, "LEDGER-L1", 50, "2026-01-06T12:00:00Z", "TX-LEND", null],
    [16, 7, "LEDGER-L2", -50, "2026-01-12T12:00:00Z", "TX-LEND-BACK", null],
    [17, 8, "LEDGER-I1", -300, "2026-01-02T12:00:00Z", null, null],
  ];
  for (const [pk, accountPk, id, amount, time, lent, repaid] of ledger) {
    subAccount({
      Z_PK: pk,
      Z_ENT: accountPk === 7 ? 23 : 24,
      ZSUBACCOUNTID: id,
      ZACCOUNT: accountPk,
      ZCURRENCYAMOUNT: amount,
      ZACTIVATIONTIME: cd(time),
      ZTRANSACTIONID: lent,
      ZTRANSACTIONID1: repaid,
    });
  }

  const logs: [string, number, string | number, number][] = [
    ["LOG-1", 1, SINCE_THE_START, 100],
    ["LOG-2", 1, "2026-01-03T09:00:00Z", 450],
    ["LOG-3", 1, "2026-01-03T12:00:00Z", 500],
    ["LOG-4", 4, "2025-12-01T12:00:00Z", 290000],
    ["LOG-5", 5, "2026-01-01T12:00:00Z", 20],
  ];
  for (const [index, [id, subPk, time, amount]] of logs.entries()) {
    insert(db, "ZMTSUBACCOUNTMODIFYAMOUNTLOG", {
      Z_PK: index + 1,
      ZLOGID: id,
      ZSUBACCOUNT: subPk,
      ZACTIVATIONTIME: typeof time === "number" ? time : cd(time),
      ZCURRENCYAMOUNT: amount,
    });
  }

  const categories: [
    number,
    number,
    string,
    string,
    string | null,
    number | null,
    number,
  ][] = [
    [1, 5, IDS.life, "Life", "Expenditure", null, 0],
    [2, 6, IDS.grocery, "超市", null, 1, 0],
    [3, 6, IDS.wifeSpend, "老婆消费", null, 1, 0],
    [4, 5, IDS.salary, "工资", "Income", null, 0],
    [5, 5, IDS.refund, "退款", "Income", null, 1],
    [6, 5, IDS.ownTransfer, "互相转", "Transfer", null, 0],
    [7, 5, IDS.otherIncome, "其他", "Income", null, 0],
  ];
  for (const [pk, entity, id, name, type, parent, notCounted] of categories) {
    insert(db, "ZMTCATEGORY", {
      Z_PK: pk,
      Z_ENT: entity,
      ZCATEGORYID: id,
      ZCATEGORYNAME: name,
      ZTYPE: type,
      ZPRIMARYCATEGORY: parent,
      ZNOLONGERUSED: 0,
      ZNOTCOUNTED: notCounted,
      ZORDER: pk,
      ZEMOJI: "🛒",
      ZCOLOR: null,
    });
  }

  insert(db, "ZMTTAGTYPE", { Z_PK: 1, ZTYPENAME: "🍔 食物", ZORDER: 0 });
  insert(db, "ZMTTAGTYPE", { Z_PK: 2, ZTYPENAME: "🥡 外卖平台", ZORDER: 1 });
  insert(db, "ZMTTAGTYPE", { Z_PK: 3, ZTYPENAME: "🚇 交通工具", ZORDER: 2 });
  insert(db, "ZMTTAG", {
    Z_PK: 1,
    ZTAGID: IDS.restaurant,
    ZTAGNAME: "Noodle Bar",
    ZTYPE: 1,
    ZORDER: 0,
  });
  insert(db, "ZMTTAG", {
    Z_PK: 2,
    ZTAGID: IDS.delivery,
    ZTAGNAME: "Courier",
    ZTYPE: 2,
    ZORDER: 0,
  });
  insert(db, "ZMTTAG", {
    Z_PK: 3,
    ZTAGID: IDS.train,
    ZTAGNAME: "火车",
    ZTYPE: 3,
    ZORDER: 0,
  });

  insert(db, "ZMTCURRENCYEXCHANGERATE", {
    Z_PK: 1,
    ZRATEID: "FX-1",
    ZSYMBOL: "CNY/GBP",
    ZPRICE: 0.1,
    ZUPDATETIME: cd("2026-01-01T08:00:00Z"),
  });
  insert(db, "ZMTCURRENCYEXCHANGERATE", {
    Z_PK: 2,
    ZRATEID: "FX-2",
    ZSYMBOL: "GBP/CNY",
    ZPRICE: 8,
    ZUPDATETIME: cd("2026-01-05T08:00:00Z"),
  });
  insert(db, "ZMTCURRENCYEXCHANGERATE", {
    Z_PK: 3,
    ZRATEID: "FX-3",
    ZSYMBOL: "CNY/GBP",
    ZPRICE: 0.2,
    ZUPDATETIME: cd("2026-01-05T07:00:00Z"),
  });

  insert(db, "ZMTONETOUCHITEM", {
    Z_PK: 1,
    ZONETOUCHITEMID: IDS.template,
    ZNAME: "",
    ZAMOUNT: -100,
    ZCURRENCYCODE: "GBP",
    ZCATEGORYID: IDS.grocery,
    ZTRANSFEROUTSUBACCOUNTID: IDS.bankSub,
    ZLINKEDREPAYABLEACCOUNTIDS: IDS.mortgage,
    ZLINKEDREPAYABLEACCOUNTAMOUNTS: "100",
    ZREMARK: "Mortgage",
  });
  insert(db, "ZMTONETOUCHITEM", {
    Z_PK: 2,
    ZONETOUCHITEMID: IDS.orphanTemplate,
    ZNAME: "Coffee",
    ZAMOUNT: -3,
    ZCURRENCYCODE: "GBP",
  });
  insert(db, "ZMTONETOUCHCRONTAB", {
    Z_PK: 1,
    ZCRONID: IDS.cron,
    ZONETOUCHITEMID: IDS.template,
    ZUNIT: "month",
    ZINTERVAL: 1,
    ZSUPPLEMENTARY: "1",
    ZBEGINDATE: cd("2026-01-01T00:00:00Z"),
    ZSTOPPED: 0,
    ZNEEDSCONFIRMATION: 0,
  });

  const bank = { sub: IDS.bankSub, account: IDS.bank };
  const card = { sub: IDS.cardSub, account: IDS.card };
  const wallet = { sub: IDS.walletSub, account: IDS.wallet };
  // Placeholder that opens an account: below one minor unit.
  transaction(db, {
    id: "TX-PLACEHOLDER",
    type: 2,
    time: "2026-01-01T00:00:00Z",
    ...bank,
    amount: 0.001,
    category: IDS.salary,
  });
  transaction(db, {
    id: "TX-SALARY",
    type: 2,
    time: "2026-01-02T09:00:00Z",
    ...bank,
    amount: 1000,
    category: IDS.salary,
    remark: "  Pay  ",
  });
  transaction(db, {
    id: "TX-INSIDE",
    type: 1,
    time: "2026-01-08T09:00:00Z",
    ...bank,
    amount: -7,
    category: IDS.grocery,
  });
  transaction(db, {
    id: "TX-AFTER",
    type: 1,
    time: "2026-01-08T15:00:00Z",
    ...bank,
    amount: -20,
    category: IDS.grocery,
    tags: `,${IDS.restaurant},${IDS.delivery}`,
  });
  transaction(db, {
    id: "TX-LATER",
    type: 1,
    time: "2026-01-09T12:00:00Z",
    ...bank,
    amount: -30,
    category: IDS.grocery,
    tags: `${IDS.train},UNKNOWN-TAG`,
  });
  transaction(db, {
    id: "TX-SHOP",
    type: 1,
    time: "2026-01-04T12:00:00Z",
    ...card,
    amount: -60,
    accountAmount: -100,
    category: IDS.wifeSpend,
  });
  transaction(db, {
    id: "TX-SHOP-REFUND",
    type: 2,
    time: "2026-01-07T12:00:00Z",
    ...card,
    amount: 40,
    category: IDS.refund,
    refund: "TX-SHOP",
  });
  transaction(db, {
    id: "TX-FX",
    type: 1,
    time: "2026-01-06T12:00:00Z",
    ...card,
    currency: "USD",
    amount: -11.114,
    accountAmount: -11.114,
    rate: 0.741,
    category: IDS.grocery,
  });
  transaction(db, {
    id: "TX-OUT",
    type: 3,
    time: "2026-01-09T13:00:00Z",
    ...bank,
    amount: -50,
    category: IDS.ownTransfer,
    transfer: "TX-IN",
    remark: "Top up",
  });
  transaction(db, {
    id: "TX-IN",
    type: 4,
    time: "2026-01-09T13:00:00Z",
    ...wallet,
    amount: 50,
    accountAmount: 400,
    category: IDS.ownTransfer,
    transfer: "TX-OUT",
    remark: "Wallet",
  });
  transaction(db, {
    id: "TX-MORTGAGE",
    type: 1,
    time: "2026-01-05T08:00:00Z",
    ...bank,
    amount: -100,
    category: IDS.grocery,
  });
  transaction(db, {
    id: "TX-LEND",
    type: 1,
    time: "2026-01-06T12:00:00Z",
    ...bank,
    amount: 0,
    accountAmount: -50,
    category: IDS.grocery,
  });
  transaction(db, {
    id: "TX-LEND-BACK",
    type: 2,
    time: "2026-01-12T12:00:00Z",
    ...bank,
    amount: 50,
    category: IDS.refund,
  });
  transaction(db, {
    id: "TX-CASHBACK",
    type: 2,
    time: "2026-01-13T12:00:00Z",
    ...card,
    amount: 2.5,
    category: IDS.refund,
  });
  transaction(db, {
    id: "TX-HMRC-REFUND",
    type: 2,
    time: "2026-01-14T12:00:00Z",
    ...bank,
    amount: 40,
    category: IDS.refund,
    remark: "HMRC tax year",
  });
  transaction(db, {
    id: "TX-TAX-REFUND",
    type: 2,
    time: "2026-01-15T12:00:00Z",
    ...bank,
    amount: 1.5,
    category: IDS.refund,
    remark: "退税",
  });
  transaction(db, {
    id: "TX-NOODLE-REFUND",
    type: 2,
    time: "2026-01-10T12:00:00Z",
    ...bank,
    amount: 20,
    category: IDS.refund,
    remark: "noodle bar refund",
  });
  transaction(db, {
    id: "TX-PENDING-NEAR",
    type: 1,
    time: "2026-03-01T08:00:00Z",
    ...bank,
    amount: -100,
    category: IDS.grocery,
    pending: 1,
    cron: IDS.cron,
  });
  transaction(db, {
    id: "TX-PENDING-FAR",
    type: 1,
    time: "2026-06-01T08:00:00Z",
    ...bank,
    amount: -100,
    category: IDS.grocery,
    pending: 1,
    cron: IDS.cron,
  });
  transaction(db, {
    id: "TX-OLD",
    type: 1,
    time: "2026-01-02T12:00:00Z",
    sub: IDS.oldSub,
    account: IDS.old,
    amount: -20,
    category: IDS.grocery,
  });
  transaction(db, {
    id: "TX-PREVIOUS-YEAR",
    type: 1,
    time: "2025-12-31T23:30:00Z",
    ...bank,
    amount: -0.005,
    accountAmount: -1,
    category: IDS.grocery,
  });
  transaction(db, {
    id: "TX-PREVIOUS-YEAR-2",
    type: 1,
    time: "2025-12-31T23:40:00Z",
    ...bank,
    amount: -0.005,
    accountAmount: -1,
    category: IDS.grocery,
  });
  return db;
}

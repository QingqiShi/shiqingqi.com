import type { DatabaseSync } from "node:sqlite";
import { type SQLOutputValue } from "node:sqlite";
import type {
  SourceAccount,
  SourceAssetType,
  SourceData,
  SourceManifest,
} from "./types.ts";

type Row = Record<string, SQLOutputValue>;

const ASSET_TYPES: readonly SourceAssetType[] = [
  "Savings Account",
  "Credit Account",
  "Investment Account",
  "Recoverable Account",
  "Repayable Account",
];

function numberOrNull(row: Row, column: string): number | null {
  const value = row[column];
  if (value === null) return null;
  if (typeof value === "number") return value;
  throw new TypeError(`${column} is not a number`);
}

function number(row: Row, column: string): number {
  const value = numberOrNull(row, column);
  if (value === null) throw new TypeError(`${column} is null`);
  return value;
}

function stringOrNull(row: Row, column: string): string | null {
  const value = row[column];
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new TypeError(`${column} is not text`);
}

function string(row: Row, column: string): string {
  const value = stringOrNull(row, column);
  if (value === null) throw new TypeError(`${column} is null`);
  return value;
}

function flag(row: Row, column: string): boolean {
  return (numberOrNull(row, column) ?? 0) !== 0;
}

/** A comma-joined id list; MoneyThings sometimes writes a leading comma. */
function idList(row: Row, column: string): string[] {
  return (stringOrNull(row, column) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");
}

function amountList(row: Row, column: string): number[] {
  return idList(row, column).map(Number);
}

function assetType(row: Row): SourceAssetType {
  const value = string(row, "ZASSETTYPE");
  const found = ASSET_TYPES.find((type) => type === value);
  if (!found) throw new Error(`Unknown asset type ${value}`);
  return found;
}

/** Reads every row the importer maps from an open MoneyThings store. */
export function readSourceRows(
  db: DatabaseSync,
  manifest: SourceManifest,
): SourceData {
  const all = (sql: string): Row[] => db.prepare(sql).all();

  const scene = all(
    "select ZSCENEID, ZSCENENAME from ZMTSCENE order by Z_PK",
  ).at(0);
  if (!scene) throw new Error("The backup has no scene");

  const accounts = all(
    "select Z_PK, ZACCOUNTID, ZACCOUNTNAME, ZASSETTYPE, ZNOTCOUNTED, ZNOLONGERUSED, ZORDER, ZINSTALMENTID from ZMTACCOUNT order by Z_PK",
  ).map((row): SourceAccount => ({
    pk: number(row, "Z_PK"),
    id: string(row, "ZACCOUNTID"),
    name: string(row, "ZACCOUNTNAME"),
    assetType: assetType(row),
    notCounted: flag(row, "ZNOTCOUNTED"),
    noLongerUsed: flag(row, "ZNOLONGERUSED"),
    order: numberOrNull(row, "ZORDER") ?? 0,
    instalmentId: stringOrNull(row, "ZINSTALMENTID"),
  }));

  const subAccounts = all(
    `select Z_PK, Z_ENT, ZSUBACCOUNTID, ZACCOUNT, ZSUBACCOUNTNAME, ZCURRENCYCODE,
       ZCURRENCYAMOUNT, ZACTIVATIONTIME, ZNOTCOUNTED, ZNOLONGERUSED, ZORDER,
       ZCREDITLIMIT, ZSTATEMENTDATE, ZPAYMENTDUEDATE, ZPAYMENTSUBACCOUNTID,
       ZTRANSACTIONID, ZTRANSACTIONID1, ZREMARK
     from ZMTSUBACCOUNT order by Z_PK`,
  ).map((row) => ({
    pk: number(row, "Z_PK"),
    entity: number(row, "Z_ENT"),
    id: string(row, "ZSUBACCOUNTID"),
    accountPk: number(row, "ZACCOUNT"),
    name: stringOrNull(row, "ZSUBACCOUNTNAME"),
    currency: stringOrNull(row, "ZCURRENCYCODE") ?? "GBP",
    amount: numberOrNull(row, "ZCURRENCYAMOUNT") ?? 0,
    activationTime: number(row, "ZACTIVATIONTIME"),
    notCounted: flag(row, "ZNOTCOUNTED"),
    noLongerUsed: flag(row, "ZNOLONGERUSED"),
    order: numberOrNull(row, "ZORDER") ?? 0,
    creditLimit: numberOrNull(row, "ZCREDITLIMIT"),
    statementDate: numberOrNull(row, "ZSTATEMENTDATE"),
    paymentDueDate: numberOrNull(row, "ZPAYMENTDUEDATE"),
    paymentSubAccountId: stringOrNull(row, "ZPAYMENTSUBACCOUNTID"),
    transactionId: stringOrNull(row, "ZTRANSACTIONID"),
    transactionId1: stringOrNull(row, "ZTRANSACTIONID1"),
    remark: (stringOrNull(row, "ZREMARK") ?? "").trim(),
  }));

  const modifyLogs = all(
    "select ZLOGID, ZSUBACCOUNT, ZACTIVATIONTIME, ZCURRENCYAMOUNT from ZMTSUBACCOUNTMODIFYAMOUNTLOG order by Z_PK",
  ).map((row) => ({
    id: string(row, "ZLOGID"),
    subAccountPk: number(row, "ZSUBACCOUNT"),
    activationTime: number(row, "ZACTIVATIONTIME"),
    amount: numberOrNull(row, "ZCURRENCYAMOUNT") ?? 0,
  }));

  const transactions = all(
    `select ZTRANSACTIONID, ZTRANSACTIONTYPE, ZPENDING, ZFLOWTIME, ZACCOUNTID,
       ZSUBACCOUNTID, ZCURRENCYCODE, ZAMOUNT, ZACCOUNTCURRENCYAMOUNT,
       ZACCOUNTCURRENCYEXCHANGERATE, ZCATEGORYID, ZTAGIDS, ZREMARK,
       ZTRANSFERTRANSACTIONID, ZREFUNDTRANSACTIONID, ZCRONID
     from ZMTTRANSACTION order by Z_PK`,
  ).map((row) => ({
    id: string(row, "ZTRANSACTIONID"),
    type: number(row, "ZTRANSACTIONTYPE"),
    pending: numberOrNull(row, "ZPENDING") ?? 0,
    flowTime: number(row, "ZFLOWTIME"),
    accountId: string(row, "ZACCOUNTID"),
    subAccountId: string(row, "ZSUBACCOUNTID"),
    currency: stringOrNull(row, "ZCURRENCYCODE") ?? "GBP",
    amount: numberOrNull(row, "ZAMOUNT") ?? 0,
    accountCurrencyAmount: numberOrNull(row, "ZACCOUNTCURRENCYAMOUNT") ?? 0,
    accountCurrencyRate: numberOrNull(row, "ZACCOUNTCURRENCYEXCHANGERATE"),
    categoryId: stringOrNull(row, "ZCATEGORYID"),
    tagIds: idList(row, "ZTAGIDS"),
    remark: (stringOrNull(row, "ZREMARK") ?? "").trim(),
    transferId: stringOrNull(row, "ZTRANSFERTRANSACTIONID"),
    refundId: stringOrNull(row, "ZREFUNDTRANSACTIONID"),
    cronId: stringOrNull(row, "ZCRONID"),
  }));

  const categories = all(
    `select Z_PK, Z_ENT, ZCATEGORYID, ZCATEGORYNAME, ZTYPE, ZPRIMARYCATEGORY,
       ZNOLONGERUSED, ZNOTCOUNTED, ZORDER, ZEMOJI, ZCOLOR
     from ZMTCATEGORY order by Z_PK`,
  ).map((row) => ({
    pk: number(row, "Z_PK"),
    entity: number(row, "Z_ENT"),
    id: string(row, "ZCATEGORYID"),
    name: string(row, "ZCATEGORYNAME").trim(),
    type: stringOrNull(row, "ZTYPE"),
    parentPk: numberOrNull(row, "ZPRIMARYCATEGORY"),
    noLongerUsed: flag(row, "ZNOLONGERUSED"),
    notCounted: flag(row, "ZNOTCOUNTED"),
    order: numberOrNull(row, "ZORDER") ?? 0,
    emoji: stringOrNull(row, "ZEMOJI") ?? "",
    color: stringOrNull(row, "ZCOLOR") ?? "",
  }));

  const tagTypes = all(
    "select Z_PK, ZTYPENAME, ZORDER from ZMTTAGTYPE order by Z_PK",
  ).map((row) => ({
    pk: number(row, "Z_PK"),
    name: string(row, "ZTYPENAME").trim(),
    order: numberOrNull(row, "ZORDER") ?? 0,
  }));

  const tags = all(
    "select Z_PK, ZTAGID, ZTAGNAME, ZTYPE, ZORDER from ZMTTAG order by Z_PK",
  ).map((row) => ({
    pk: number(row, "Z_PK"),
    id: string(row, "ZTAGID"),
    name: string(row, "ZTAGNAME").trim(),
    typePk: numberOrNull(row, "ZTYPE"),
    order: numberOrNull(row, "ZORDER") ?? 0,
  }));

  const fxRates = all(
    "select ZRATEID, ZSYMBOL, ZPRICE, ZUPDATETIME from ZMTCURRENCYEXCHANGERATE order by Z_PK",
  ).map((row) => ({
    id: string(row, "ZRATEID"),
    symbol: string(row, "ZSYMBOL"),
    price: number(row, "ZPRICE"),
    updateTime: number(row, "ZUPDATETIME"),
  }));

  const templates = all(
    `select ZONETOUCHITEMID, ZNAME, ZAMOUNT, ZCURRENCYCODE, ZCATEGORYID,
       ZTRANSFEROUTSUBACCOUNTID, ZTRANSFERINSUBACCOUNTID, ZTAGIDS, ZREMARK,
       ZLINKEDREPAYABLEACCOUNTIDS, ZLINKEDREPAYABLEACCOUNTAMOUNTS,
       ZRECOVERABLEACCOUNTIDS, ZRECOVERABLEACCOUNTAMOUNTS
     from ZMTONETOUCHITEM order by Z_PK`,
  ).map((row) => ({
    id: string(row, "ZONETOUCHITEMID"),
    name: (stringOrNull(row, "ZNAME") ?? "").trim(),
    amount: numberOrNull(row, "ZAMOUNT"),
    currency: stringOrNull(row, "ZCURRENCYCODE") ?? "GBP",
    categoryId: stringOrNull(row, "ZCATEGORYID"),
    outSubAccountId: stringOrNull(row, "ZTRANSFEROUTSUBACCOUNTID"),
    inSubAccountId: stringOrNull(row, "ZTRANSFERINSUBACCOUNTID"),
    tagIds: idList(row, "ZTAGIDS"),
    remark: (stringOrNull(row, "ZREMARK") ?? "").trim(),
    linkedRepayableAccountIds: idList(row, "ZLINKEDREPAYABLEACCOUNTIDS"),
    linkedRepayableAmounts: amountList(row, "ZLINKEDREPAYABLEACCOUNTAMOUNTS"),
    recoverableAccountIds: idList(row, "ZRECOVERABLEACCOUNTIDS"),
    recoverableAmounts: amountList(row, "ZRECOVERABLEACCOUNTAMOUNTS"),
  }));

  const crontabs = all(
    `select ZCRONID, ZONETOUCHITEMID, ZUNIT, ZINTERVAL, ZSUPPLEMENTARY,
       ZBEGINDATE, ZSTOPPED, ZNEEDSCONFIRMATION, ZENDDATE
     from ZMTONETOUCHCRONTAB order by Z_PK`,
  ).map((row) => ({
    id: string(row, "ZCRONID"),
    templateId: string(row, "ZONETOUCHITEMID"),
    unit: stringOrNull(row, "ZUNIT") ?? "month",
    interval: numberOrNull(row, "ZINTERVAL") ?? 1,
    supplementary: stringOrNull(row, "ZSUPPLEMENTARY") ?? "",
    beginDate: number(row, "ZBEGINDATE"),
    stopped: flag(row, "ZSTOPPED"),
    needsConfirmation: flag(row, "ZNEEDSCONFIRMATION"),
    endDate: numberOrNull(row, "ZENDDATE"),
  }));

  return {
    manifest,
    sceneId: string(scene, "ZSCENEID"),
    sceneName: string(scene, "ZSCENENAME"),
    accounts,
    subAccounts,
    modifyLogs,
    transactions,
    categories,
    tagTypes,
    tags,
    fxRates,
    templates,
    crontabs,
  };
}

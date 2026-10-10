export type AccountKind =
  "cash" | "credit" | "investment" | "property" | "loan" | "receivable";

/** Credit cards and loans are liabilities; every other kind is an asset. */
export function sideOfKind(kind: AccountKind): "asset" | "liability" {
  return kind === "credit" || kind === "loan" ? "liability" : "asset";
}

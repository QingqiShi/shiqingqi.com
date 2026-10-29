export type SyntheticGroupKey =
  | "liquid"
  | "investments"
  | "retirement"
  | "property"
  | "propertyDebt"
  | "studentLoans"
  | "credit"
  | "otherAssets"
  | "otherDebts";

interface SyntheticGroup {
  key: SyntheticGroupKey;
  name: string;
  side: "asset" | "liability";
}

/** A Group holds one side only, so each fallback has its own name. */
export const SYNTHETIC_GROUPS: readonly SyntheticGroup[] = [
  { key: "liquid", name: "流动资产", side: "asset" },
  { key: "investments", name: "投资", side: "asset" },
  { key: "retirement", name: "退休资产", side: "asset" },
  { key: "property", name: "不动产", side: "asset" },
  { key: "otherAssets", name: "其他资产", side: "asset" },
  { key: "propertyDebt", name: "不动产负债", side: "liability" },
  { key: "studentLoans", name: "学贷", side: "liability" },
  { key: "credit", name: "信用", side: "liability" },
  { key: "otherDebts", name: "其他负债", side: "liability" },
];

import { parseMoney } from "../domain/money/parse-money.ts";

export interface QuickAdd {
  kind: "expense" | "income" | "transfer";
  /** False when no sign or `>` chose the kind, so a form may keep its own. */
  kindIsExplicit: boolean;
  /** Positive minor units, or null when the text has no amount yet. */
  amountMinor: number | null;
  /** The Payee text; for a transfer, the text that names the source account. */
  text: string;
  /** For a transfer, the text that names the target account. */
  toText: string;
  /** The text after an amount in the middle, which names the account: `tesco 8 visa`. */
  accountText: string;
}

function readAmount(token: string, currency: string) {
  const minor = parseMoney(token, currency);
  if (minor === null) return null;
  const sign = token.startsWith("+") ? "+" : minor < 0 ? "-" : null;
  return { minor: Math.abs(minor), sign };
}

/** The amount at the start, at the end or in the middle of `text`, and the words around it. */
function splitAmount(text: string, currency: string) {
  const words = text.split(/\s+/).filter((word) => word !== "");
  if (words.length === 0) return { amount: null, rest: "", after: "" };
  const first = readAmount(words[0], currency);
  if (first) {
    return { amount: first, rest: words.slice(1).join(" "), after: "" };
  }
  if (words.length > 1) {
    const last = readAmount(words[words.length - 1], currency);
    if (last) {
      return { amount: last, rest: words.slice(0, -1).join(" "), after: "" };
    }
  }
  for (let index = 1; index < words.length - 1; index++) {
    const middle = readAmount(words[index], currency);
    if (middle) {
      return {
        amount: middle,
        rest: words.slice(0, index).join(" "),
        after: words.slice(index + 1).join(" "),
      };
    }
  }
  return { amount: null, rest: words.join(" "), after: "" };
}

/**
 * Reads the one-line quick add: `12.5 ocado` or `ocado 12.5` is an expense,
 * `ocado 12.5 visa` names the account too, a leading `+` makes it an income
 * (`+2000 salary`), and `>` makes a transfer
 * to the account named after it (`500 > isa`, or `500 current > isa` to name
 * the source too). Returns null for empty text.
 */
export function parseQuickAdd(
  input: string,
  currency: string,
): QuickAdd | null {
  const text = input.normalize("NFKC").trim();
  if (text === "") return null;

  const arrow = text.indexOf(">");
  if (arrow !== -1) {
    const { amount, rest } = splitAmount(text.slice(0, arrow), currency);
    return {
      kind: "transfer",
      kindIsExplicit: true,
      amountMinor: amount?.minor ?? null,
      text: rest,
      toText: text
        .slice(arrow + 1)
        .trim()
        .replace(/\s+/g, " "),
      accountText: "",
    };
  }

  const { amount, rest, after } = splitAmount(text, currency);
  const sign = amount?.sign ?? null;
  return {
    kind: sign === "+" ? "income" : "expense",
    kindIsExplicit: sign !== null,
    amountMinor: amount?.minor ?? null,
    text: rest,
    toText: "",
    accountText: after,
  };
}

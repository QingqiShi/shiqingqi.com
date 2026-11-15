/** What the labeller was unsure of, as `labelBankRows` names it in its reason. */
export type AiDoubtSubject =
  "kind" | "category" | "payee" | "other side" | "loan or money owed";

/** One thing the labeller was unsure of, with its answer and the strongest other answer. */
export interface AiDoubt {
  subject: AiDoubtSubject;
  options: { label: string; percent: number }[];
}

const SUBJECTS = new Set<string>([
  "kind",
  "category",
  "payee",
  "other side",
  "loan or money owed",
]);

const DOUBT = /^Unsure of the (.+?): (.+)$/;
const OPTION = /^(.+) (\d{1,3})%$/;

function isSubject(value: string): value is AiDoubtSubject {
  return SUBJECTS.has(value);
}

/**
 * Reads the reason that `labelBankRows` writes, such as "Unsure of the kind:
 * expense 52%, transfer 48%; Unsure of the category: Food > Groceries 55%",
 * so the list can show it in the Member's language. Returns null for any
 * other text, such as a reason a person or an older labeller wrote, or one
 * cut short at its length limit.
 */
export function parseAiDoubts(reason: string): AiDoubt[] | null {
  const doubts: AiDoubt[] = [];
  for (const part of reason.split("; ")) {
    const match = DOUBT.exec(part);
    if (!match) return null;
    const [, subject = "", list = ""] = match;
    if (!isSubject(subject)) return null;
    const options: AiDoubt["options"] = [];
    for (const item of list.split(", ")) {
      const option = OPTION.exec(item);
      if (!option) return null;
      const [, label = "", percent = ""] = option;
      options.push({ label, percent: Number(percent) });
    }
    doubts.push({ subject, options });
  }
  return doubts.length > 0 ? doubts : null;
}

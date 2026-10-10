export type OwnerKey = "husband" | "wife";

const PREFIXES: readonly { prefix: string; owner: OwnerKey }[] = [
  { prefix: "老公", owner: "husband" },
  { prefix: "老婆", owner: "wife" },
];

/**
 * MoneyThings has no account owner: the household writes 老公 or 老婆 in
 * front of the name. Returns that owner and the name without the prefix.
 */
export function splitOwnerPrefix(name: string): {
  owner: OwnerKey | null;
  name: string;
} {
  const trimmed = name.trim();
  for (const { prefix, owner } of PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length);
      // A prefix that runs into Chinese text is part of a word, as in
      // 老婆婆 (an old woman). It is not an owner.
      if (rest.trim() !== "" && !/^\p{Script=Han}/u.test(rest)) {
        return { owner, name: rest.trim() };
      }
    }
  }
  return { owner: null, name: trimmed };
}

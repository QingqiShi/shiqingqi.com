/** The ways to shorten one name to two characters, the plainest first. */
function candidatesOf(name: string): string[] {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));
  if (words.length === 0) return [];
  const first = words[0];
  const last = words[words.length - 1];
  const candidates: string[] = [];
  if (words.length > 1) {
    candidates.push(first[0] + last[0]);
    for (const word of words.slice(1, -1)) candidates.push(first[0] + word[0]);
    for (const letter of last.slice(1)) candidates.push(first[0] + letter);
  } else {
    candidates.push(first[0]);
  }
  for (const letter of first.slice(1)) candidates.push(first[0] + letter);
  return candidates.map((candidate) => candidate.toLocaleUpperCase());
}

/**
 * Up to two characters for each name, which tell the names apart where they
 * can: the first letters of the first and last word, as a monogram has, and
 * other letters of the name where two names would share them. Names that
 * cannot be told apart that way take a number. The result keeps the order
 * of `names`.
 */
export function accountInitials(names: readonly string[]): string[] {
  const taken = new Set<string>();
  return names.map((name) => {
    const candidates = candidatesOf(name);
    const free = candidates.find((candidate) => !taken.has(candidate));
    if (free !== undefined) {
      taken.add(free);
      return free;
    }
    const stem = candidates.at(0)?.slice(0, 1) ?? "";
    let number = 2;
    while (taken.has(`${stem}${String(number)}`)) number++;
    const numbered = `${stem}${String(number)}`;
    taken.add(numbered);
    return numbered;
  });
}

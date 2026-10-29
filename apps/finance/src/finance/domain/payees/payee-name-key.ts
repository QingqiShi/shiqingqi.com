/**
 * What makes two Payee names the same name: letters and digits only, lower
 * case, without accents, with "&" read as "and". "Marks & Spencer",
 * "MARKS AND SPENCER" and "Marks-and-Spencer." have one key.
 */
export function payeeNameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

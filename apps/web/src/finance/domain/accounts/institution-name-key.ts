/** The key two Households share for the same institution name: case, width and spacing do not count. */
export function institutionNameKey(name: string) {
  return name.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLowerCase();
}

/** A test that a row has every field of `match` with the same value; both drafts read rows by it. */
export function rowMatcher(match: object) {
  const fields = Object.entries(match);
  return (row: object) =>
    fields.every(([field, value]) => Reflect.get(row, field) === value);
}

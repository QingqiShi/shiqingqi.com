/**
 * A fact of the trip, with a note in brackets at its end taken apart from
 * it: "约 5 小时（分段）" is "约 5 小时" and "（分段）".
 */
export function splitNote(text: string): { main: string; note: string | null } {
  const bracket = text.search(/[（(]/);
  if (bracket <= 0) return { main: text, note: null };
  return { main: text.slice(0, bracket).trim(), note: text.slice(bracket) };
}

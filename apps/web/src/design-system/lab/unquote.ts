/** Strip the quotes a generated default carries, so `'"md"'` reads as `md`. */
export function unquote(source: string | undefined) {
  return source === undefined ? undefined : source.replaceAll('"', "");
}

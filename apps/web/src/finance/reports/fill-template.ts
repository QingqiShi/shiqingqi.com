/** Puts each value in place of its `{name}` in a translated template. */
export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? values[name] : match,
  );
}

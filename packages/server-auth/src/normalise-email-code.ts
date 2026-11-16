/** The six digits of a typed code, with spaces and dashes taken out, or null. */
export function normaliseEmailCode(value: string): string | null {
  const code = value.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

type StripNull<T> = {
  [K in keyof T]: Exclude<T[K], null>;
};

export function sanitizeParams<T extends Record<string, unknown>>(
  params: T,
): StripNull<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null),
  ) as StripNull<T>;
}

import type { Token } from "#src/calculator/types.ts";

export function isErrorToken(token: Token): boolean {
  return token.type === "number" && Number.isNaN(Number(token.raw));
}

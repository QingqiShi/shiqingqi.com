import type { TOKEN_KINDS } from "./token-kinds.ts";

export type CodeTokenKind = (typeof TOKEN_KINDS)[number];

/** One run of a snippet: its kind, then its exact source text. */
export type CodeToken = readonly [CodeTokenKind, string];

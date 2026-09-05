/**
 * The kinds of run a snippet can hold. The Babel plugin emits the same list, so
 * change the two together.
 */
export const TOKEN_KINDS = [
  "plain", // whitespace, and text with no other role
  "keyword", // import, from, const, type, return, function
  "string", // "…", '…', `…`
  "comment", // // … and /* … */
  "number",
  "tag", // JSX element name that starts lowercase — div, span
  "component", // JSX element name that starts uppercase — Button, Card
  "attr", // JSX attribute name
  "property", // object key, and the name after a dot
  "punct", // < > / { } = ( ) , ; :
] as const;

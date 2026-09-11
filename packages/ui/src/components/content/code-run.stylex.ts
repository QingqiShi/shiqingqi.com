import * as stylex from "@stylexjs/stylex";
import { syntax } from "./syntax.stylex.ts";

/** One run's colour, by the kind of thing it is. Shared by every code surface. */
export const codeRun = stylex.create({
  plain: { color: syntax.plain },
  keyword: { color: syntax.keyword },
  string: { color: syntax.string },
  comment: { color: syntax.comment, fontStyle: "italic" },
  number: { color: syntax.number },
  tag: { color: syntax.tag },
  component: { color: syntax.component },
  attr: { color: syntax.attr },
  property: { color: syntax.property },
  punct: { color: syntax.punct },
});

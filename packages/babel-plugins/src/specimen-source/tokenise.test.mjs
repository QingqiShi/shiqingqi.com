import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { tokenise } = require("./tokenise");

/**
 * Every construct the design-system pages put in front of the tokeniser.
 * @type {string[]}
 */
const unitFixtures = [
  "// a comment on the first line\nconst x = 1;",
  "/* block */ const y = 0x1f + 2e3 + 1_000n;",
  "const quotes = [\"a\\\"b\", 'c\\'d', `e`];",
  "const held = `before ${count + 1} after`;",
  "const nested = `${`${inner}`}`;",
  "<Button look='primary'>Go</Button>",
  "<><Card />\n<span>{value}</span></>",
  "<Icons.Trash weight=\"bold\" aria-label='Delete' />",
  "const [plan, setPlan] = useState<'free' | 'pro'>('free');",
  "if (a < b && c > d) return;",
  "const styles = stylex.create({ card: { gap: space._2 } });",
  "function Cell({ caption }: { caption: string }) {\n  return <div>{caption}</div>;\n}",
  "const rows = items.map((item) => <Row key={item.id} {...item} />);",
  "<div>{/* a comment child */}</div>",
  "<Card />\n\n<Card />",
  "",
  "\n\n",
];

/**
 * Concatenate every run's text.
 * @param {[string, string][]} tokens
 * @returns {string}
 */
function join(tokens) {
  return tokens.map(([, text]) => text).join("");
}

describe("tokenise", () => {
  describe("round trip", () => {
    it("reproduces every unit fixture byte for byte", () => {
      unitFixtures.forEach((source, index) => {
        expect(join(tokenise(source)), `fixture ${String(index)}`).toBe(source);
      });
    });
  });
});

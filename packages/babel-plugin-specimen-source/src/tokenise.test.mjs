import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { realSnippets } from "./real-snippets.fixture.mjs";

const require = createRequire(import.meta.url);
const { TOKEN_KINDS } = require("./token-kinds");
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
  "<Button variant='primary'>Go</Button>",
  "<><Card />\n<span>{value}</span></>",
  "<Icons.Trash weight=\"bold\" aria-label='Delete' />",
  "const [plan, setPlan] = useState<'free' | 'pro'>('free');",
  "if (a < b && c > d) return;",
  "const styles = stylex.create({ card: { gap: space._2 } });",
  "function Cell({ caption }: { caption: string }) {\n  return <div>{caption}</div>;\n}",
  "const rows = items.map((item) => <Row key={item.id} {...item} />);",
  "<div>{/* a comment child */}</div>",
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

/**
 * The kinds given to one exact piece of text.
 * @param {string} source
 * @param {string} text
 * @returns {string[]}
 */
function kindsOf(source, text) {
  return tokenise(source)
    .filter(([, value]) => value === text)
    .map(([kind]) => kind);
}

describe("tokenise", () => {
  describe("round trip", () => {
    it("reproduces every unit fixture byte for byte", () => {
      unitFixtures.forEach((source, index) => {
        expect(join(tokenise(source)), `fixture ${String(index)}`).toBe(source);
      });
    });

    it("reproduces every design-system snippet byte for byte", () => {
      realSnippets.forEach((source, index) => {
        expect(join(tokenise(source)), `snippet ${String(index)}`).toBe(source);
      });
    });

    it("emits only known kinds and never an empty run", () => {
      for (const source of [...unitFixtures, ...realSnippets]) {
        for (const [kind, text] of tokenise(source)) {
          expect(TOKEN_KINDS).toContain(kind);
          expect(text).not.toBe("");
        }
      }
    });
  });

  describe("comments", () => {
    it("reads a line comment on the first line", () => {
      expect(tokenise("// note\nconst x = 1;")[0]).toEqual([
        "comment",
        "// note",
      ]);
    });

    it("reads a block comment", () => {
      expect(kindsOf("/* note */ const x = 1;", "/* note */")).toEqual([
        "comment",
      ]);
    });

    it("reads a comment inside a tag, which the snippets use to annotate", () => {
      expect(
        kindsOf(
          '<TextField\n  label="Name" // what is this\n/>',
          "// what is this",
        ),
      ).toEqual(["comment"]);
    });
  });

  describe("strings", () => {
    it("reads all three quote styles", () => {
      const tokens = tokenise("const a = \"one\" + 'two' + `three`;");
      expect(tokens).toContainEqual(["string", '"one"']);
      expect(tokens).toContainEqual(["string", "'two'"]);
      expect(tokens).toContainEqual(["string", "`three`"]);
    });

    it("keeps an escaped quote inside the string", () => {
      expect(kindsOf('const a = "say \\"hi\\"";', '"say \\"hi\\""')).toEqual([
        "string",
      ]);
    });

    it("reads the contents of a template hole as code, not as string", () => {
      const tokens = tokenise("`total ${count + 1} items`");
      expect(tokens).toContainEqual(["string", "`total "]);
      expect(tokens).toContainEqual(["punct", "${"]);
      expect(tokens).toContainEqual(["number", "1"]);
      expect(tokens).toContainEqual(["string", " items`"]);
    });
  });

  describe("JSX", () => {
    it("calls a lowercase element a tag and an uppercase one a component", () => {
      const tokens = tokenise("<div><Button /></div>");
      expect(tokens).toContainEqual(["tag", "div"]);
      expect(tokens).toContainEqual(["component", "Button"]);
    });

    it("calls a dotted element a component", () => {
      expect(kindsOf("<Icons.Trash />", "Icons.Trash")).toEqual(["component"]);
    });

    it("marks attribute names", () => {
      const tokens = tokenise('<Button variant="primary" aria-label="Go" />');
      expect(tokens).toContainEqual(["attr", "variant"]);
      expect(tokens).toContainEqual(["attr", "aria-label"]);
      expect(tokens).toContainEqual(["string", '"primary"']);
    });

    it("reads a fragment", () => {
      expect(join(tokenise("<><Card /></>"))).toBe("<><Card /></>");
      expect(tokenise("<><Card /></>")).toContainEqual(["component", "Card"]);
    });

    it("treats the braces of a child container as punctuation", () => {
      expect(tokenise("<div>{count}</div>")).toEqual([
        ["punct", "<"],
        ["tag", "div"],
        ["punct", ">{"],
        ["plain", "count"],
        ["punct", "}</"],
        ["tag", "div"],
        ["punct", ">"],
      ]);
    });

    it("returns to code after a self-closing element", () => {
      const tokens = tokenise("const el = <Card />;\nconst n = 2;");
      expect(tokens).toContainEqual(["number", "2"]);
      expect(tokens).toContainEqual(["keyword", "const"]);
    });
  });

  describe("the angle bracket", () => {
    it("opens a tag after an equals sign", () => {
      expect(kindsOf("const el = <Card />;", "Card")).toEqual(["component"]);
    });

    it("is punctuation in a generic argument list", () => {
      const tokens = tokenise('useState<Density>("cozy")');
      expect(tokens).toContainEqual(["punct", "<"]);
      expect(tokens).not.toContainEqual(["component", "Density"]);
    });

    it("is punctuation in a comparison", () => {
      const tokens = tokenise("if (count < limit) return;");
      expect(tokens).toContainEqual(["punct", "<"]);
    });

    it("opens a tag after a return", () => {
      expect(kindsOf("return <Card />;", "Card")).toEqual(["component"]);
    });
  });

  describe("code", () => {
    it("marks keywords", () => {
      const tokens = tokenise('import { Button } from "./button";');
      expect(tokens).toContainEqual(["keyword", "import"]);
      expect(tokens).toContainEqual(["keyword", "from"]);
    });

    it("marks numbers", () => {
      const tokens = tokenise("const a = 42 + 0x1f + 1.5e3;");
      expect(tokens).toContainEqual(["number", "42"]);
      expect(tokens).toContainEqual(["number", "0x1f"]);
      expect(tokens).toContainEqual(["number", "1.5e3"]);
    });

    it("marks an object key", () => {
      const tokens = tokenise("const a = { gap: 1, size: 2 };");
      expect(tokens).toContainEqual(["property", "gap"]);
      expect(tokens).toContainEqual(["property", "size"]);
    });

    it("marks an optional key on an interface member", () => {
      const tokens = tokenise("interface P { value?: number; step: number }");
      expect(tokens).toContainEqual(["property", "value"]);
      expect(tokens).toContainEqual(["property", "step"]);
    });

    it("marks the name after a dot", () => {
      expect(kindsOf("styles.card", "card")).toEqual(["property"]);
    });

    it("leaves a spread name alone", () => {
      const tokens = tokenise("<div {...props} />");
      expect(tokens).toContainEqual(["plain", "props"]);
      expect(tokens).not.toContainEqual(["property", "props"]);
    });

    it("joins neighbouring runs of the same kind", () => {
      expect(tokenise("const x = 1;")).toEqual([
        ["keyword", "const"],
        ["plain", " x "],
        ["punct", "="],
        ["plain", " "],
        ["number", "1"],
        ["punct", ";"],
      ]);
    });

    it("prefers the key over the keyword for a name like type", () => {
      expect(kindsOf('const row = { type: "button" };', "type")).toEqual([
        "property",
      ]);
    });

    it("does not mistake a ternary branch for a key", () => {
      const tokens = tokenise("const a = open ? shown : hidden;");
      expect(tokens).not.toContainEqual(["property", "shown"]);
    });
  });
});

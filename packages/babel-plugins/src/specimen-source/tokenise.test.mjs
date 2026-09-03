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

    it("separates as many siblings as the ceiling allows", () => {
      const source = Array.from({ length: 20 }, () => "<A />").join("\n\n");
      const tokens = tokenise(source);
      expect(join(tokens)).toBe(source);
      expect(tokens).toContainEqual(["component", "A"]);
    });
  });

  describe("source that does not parse", () => {
    it("throws, quoting the snippet", () => {
      expect(() => tokenise("pnpm add --save-dev @tuja/ui"))
        .toThrowErrorMatchingInlineSnapshot(`
        [Error: [specimen-source]
        The snippet is not valid TSX. A specimen expects TypeScript or TSX.
          pnpm add --save-dev @tuja/ui]
      `);
    });

    it("quotes the snippet, up to three lines", () => {
      const source =
        '<Progress label="Checkout" />\n\n<!-- renders -->\n\n<div />';
      expect(() => tokenise(source)).toThrow("<!-- renders -->");
      expect(() => tokenise(source)).toThrow('<Progress label="Checkout" />');
    });

    it("keeps the Babel error as the cause", () => {
      try {
        tokenise("pnpm add --save-dev @tuja/ui");
        expect.unreachable("tokenise should have thrown");
      } catch (error) {
        expect(error.cause).toBeInstanceOf(Error);
        expect(error.cause.message).not.toBe("");
        expect(error.cause.message).not.toBe(error.message);
      }
    });

    it("throws past the separator ceiling", () => {
      const source = Array.from({ length: 45 }, () => "<A />").join("\n\n");
      expect(() => tokenise(source)).toThrow("not valid TSX");
    });

    it("gives up on an error the separator cannot fix", () => {
      // The `)` follows whitespace that follows a `>`, which is the shape the
      // repair looks for. Only the reason Babel gives rules it out.
      try {
        tokenise("<div />\n\n)");
        expect.unreachable("tokenise should have thrown");
      } catch (error) {
        expect(error.cause.reasonCode).toBe("UnexpectedToken");
        // Line 3 of the source as written, so no `;` went in first.
        expect(error.cause.message).toContain("Unexpected token (3:0)");
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

    it("reads a comment child", () => {
      expect(tokenise("<div>{/* a comment child */}</div>")).toContainEqual([
        "comment",
        "/* a comment child */",
      ]);
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

    it("reads a regular expression as a string, not as division", () => {
      expect(kindsOf("const slug = /[a-z>]+/g;", "/[a-z>]+/g")).toEqual([
        "string",
      ]);
    });
  });

  describe("JSX", () => {
    it("calls a lowercase element a tag and an uppercase one a component", () => {
      const tokens = tokenise("<div><Button /></div>");
      expect(tokens).toContainEqual(["tag", "div"]);
      expect(tokens).toContainEqual(["component", "Button"]);
    });

    it("calls both halves of a dotted element a component", () => {
      expect(tokenise("<Icons.Trash />")).toEqual([
        ["punct", "<"],
        ["component", "Icons"],
        ["punct", "."],
        ["component", "Trash"],
        ["plain", " "],
        ["punct", "/>"],
      ]);
    });

    it("calls both halves of a namespaced element a tag", () => {
      expect(tokenise("<svg:rect x={1} />")).toEqual([
        ["punct", "<"],
        ["tag", "svg"],
        ["punct", ":"],
        ["tag", "rect"],
        ["plain", " "],
        ["attr", "x"],
        ["punct", "={"],
        ["number", "1"],
        ["punct", "}"],
        ["plain", " "],
        ["punct", "/>"],
      ]);
    });

    it("marks both halves of a namespaced attribute name", () => {
      const tokens = tokenise('<a xlink:href="x" />');
      expect(tokens).toContainEqual(["attr", "xlink"]);
      expect(tokens).toContainEqual(["attr", "href"]);
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

    it("leaves element text as prose, whatever words it holds", () => {
      const tokens = tokenise("<Text>the type scale, in use</Text>");
      expect(tokens).toContainEqual(["plain", "the type scale, in use"]);
      expect(tokens.map(([kind]) => kind)).not.toContain("keyword");
    });

    it("reads two sibling elements with no semicolon between them", () => {
      const source = '<Progress label="Checkout" />\n\n// renders\n\n<div />';
      const tokens = tokenise(source);
      expect(join(tokens)).toBe(source);
      expect(tokens).toContainEqual(["component", "Progress"]);
      expect(tokens).toContainEqual(["comment", "// renders"]);
      expect(tokens).toContainEqual(["tag", "div"]);
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

    it("opens a tag after a return", () => {
      expect(kindsOf("return <Card />;", "Card")).toEqual(["component"]);
    });

    it("is punctuation in a generic argument list", () => {
      expect(tokenise('useState<Density>("cozy")')).toEqual([
        ["plain", "useState"],
        ["punct", "<"],
        ["plain", "Density"],
        ["punct", ">("],
        ["string", '"cozy"'],
        ["punct", ")"],
      ]);
    });

    it("is punctuation in a comparison", () => {
      const tokens = tokenise("if (count < limit) return;");
      expect(tokens).toContainEqual(["punct", "<"]);
    });
  });

  describe("code", () => {
    it("marks keywords", () => {
      const tokens = tokenise('import { Button } from "./button";');
      expect(tokens).toContainEqual(["keyword", "import"]);
      expect(tokens).toContainEqual(["keyword", "from"]);
    });

    it("marks a keyword TypeScript spells as a plain name", () => {
      const tokens = tokenise(
        "interface P {}\nasync function f() { await g(); }",
      );
      expect(tokens).toContainEqual(["keyword", "interface"]);
      expect(tokens).toContainEqual(["keyword", "async"]);
      expect(tokens).toContainEqual(["keyword", "await"]);
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

    it("leaves a quoted key as a string", () => {
      expect(
        kindsOf('const a = { "aria-label": "Go" };', '"aria-label"'),
      ).toEqual(["string"]);
    });

    it("marks the name after a dot", () => {
      expect(tokenise("console.log(x)")).toEqual([
        ["plain", "console"],
        ["punct", "."],
        ["property", "log"],
        ["punct", "("],
        ["plain", "x"],
        ["punct", ")"],
      ]);
    });

    it("marks the name after an optional dot", () => {
      expect(kindsOf("theme?.card", "card")).toEqual(["property"]);
    });

    it("leaves a spread name alone", () => {
      expect(kindsOf("<div {...props} />", "props")).toEqual(["plain"]);
    });

    it("leaves a shorthand key alone, because it names a binding", () => {
      expect(tokenise("function Row({ href, children }) {}")).toEqual([
        ["keyword", "function"],
        ["plain", " Row"],
        ["punct", "({"],
        ["plain", " href"],
        ["punct", ","],
        ["plain", " children "],
        ["punct", "})"],
        ["plain", " "],
        ["punct", "{}"],
      ]);
    });

    it("marks a private class member", () => {
      const tokens = tokenise("class C { #p = 1; get #q() {} }");
      expect(tokens).toContainEqual(["property", "#p"]);
      expect(tokens).toContainEqual(["property", "#q"]);
      expect(
        kindsOf("class C { #p = 1; r() { return this.#p; } }", "#p"),
      ).toEqual(["property", "property"]);
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
      expect(tokenise("const a = open ? shown : hidden;")).toEqual([
        ["keyword", "const"],
        ["plain", " a "],
        ["punct", "="],
        ["plain", " open "],
        ["punct", "?"],
        ["plain", " shown "],
        ["punct", ":"],
        ["plain", " hidden"],
        ["punct", ";"],
      ]);
    });
  });
});

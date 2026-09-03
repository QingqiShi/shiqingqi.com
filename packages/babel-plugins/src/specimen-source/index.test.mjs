import { createRequire } from "node:module";
import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pluginPath = require.resolve("./index");

/**
 * Run the plugin and collect every `source` prop it injected.
 *
 * The capture plugin runs second, so it sees the props the first plugin added
 * during `Program: { enter }`.
 * @param {string} code
 * @param {string} [filename]
 * @returns {{ element: string, tokens: [string, string][] }[]}
 */
function collect(code, filename = "showcase.tsx") {
  /** @type {{ element: string, tokens: [string, string][] }[]} */
  const found = [];

  /** @param {{ types: typeof import("@babel/types") }} babel */
  const capture = ({ types: t }) => ({
    name: "capture-source",
    visitor: {
      /**
       * @param {import("@babel/traverse").NodePath<
       *   import("@babel/types").JSXOpeningElement
       * >} path
       */
      JSXOpeningElement(path) {
        const element = path.node.name;
        if (!t.isJSXIdentifier(element)) return;
        const attribute = path.node.attributes.find(
          (one) =>
            t.isJSXAttribute(one) &&
            t.isJSXIdentifier(one.name, { name: "source" }),
        );
        if (!t.isJSXAttribute(attribute)) return;
        if (!t.isJSXExpressionContainer(attribute.value)) return;
        const array = attribute.value.expression;
        if (!t.isArrayExpression(array)) return;
        found.push({
          element: element.name,
          tokens: array.elements.map((pair) =>
            t.isArrayExpression(pair)
              ? pair.elements.map((part) =>
                  t.isStringLiteral(part) ? part.value : "",
                )
              : [],
          ),
        });
      },
    },
  });

  const result = transformSync(code, {
    filename,
    parserOpts: { plugins: ["typescript", "jsx"] },
    plugins: [pluginPath, capture],
    configFile: false,
    babelrc: false,
  });
  if (!result) throw new Error("Transform returned no result");
  return found;
}

/**
 * Run the plugin and return what it compiled to.
 * @param {string} code
 * @returns {string}
 */
function transform(code) {
  const result = transformSync(code, {
    filename: "showcase.tsx",
    parserOpts: { plugins: ["typescript", "jsx"] },
    plugins: [pluginPath],
    configFile: false,
    babelrc: false,
  });
  if (result?.code == null) throw new Error("Transform returned no code");
  return result.code;
}

/**
 * The source of the first injected prop, read back from its tokens.
 * @param {string} code
 * @param {string} [element]
 * @returns {string}
 */
function sourceOf(code, element = "Specimen") {
  const match = collect(code).find((one) => one.element === element);
  if (!match) throw new Error(`No source prop on <${element}>`);
  return match.tokens.map(([, text]) => text).join("");
}

const IMPORTS = `import { Button } from "@tuja/ui/components/button";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
`;

describe("specimen-source", () => {
  describe("what it injects", () => {
    it("gives a Specimen the source of its children", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Showcase label={t({ en: "Variants", zh: "风格" })}>
      <Specimen caption="primary">
        <Button variant="primary">{t({ en: "Primary", zh: "主要" })}</Button>
      </Specimen>
    </Showcase>
  );
}
`;

      expect(sourceOf(code))
        .toBe(`import { Button } from "@tuja/ui/components/button";

<Button variant="primary">Primary</Button>`);
    });

    it("leaves an element that already has a source prop alone", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="primary" source={[["plain", "hand written"]]}>
      <Button>Go</Button>
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toBe("hand written");
    });

    it("leaves source={undefined} alone, which is how a test asks for no source", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="primary" source={undefined}>
      <Button>Go</Button>
    </Specimen>
  );
}
`;

      expect(collect(code)).toHaveLength(0);
      expect(transform(code)).toContain("source={undefined}");
    });

    it("skips a Specimen with no children", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return <Specimen caption="empty" />;
}
`;

      expect(collect(code)).toHaveLength(0);
    });

    it("leaves a file with no specimen untouched", () => {
      const code = `${IMPORTS}
export function Plain() {
  return <Button>Go</Button>;
}
`;

      expect(collect(code)).toHaveLength(0);
    });
  });

  describe("dropping chrome", () => {
    it("drops the whole line a chrome element sits on", () => {
      const code = `${IMPORTS}import { ShowcaseHelper } from "../../showcase-helper.tsx";

export function ButtonShowcase() {
  return (
    <Specimen caption="loading">
      <Button loading>Save</Button>
      <ShowcaseHelper>{t({ en: "Busy", zh: "忙碌" })}</ShowcaseHelper>
    </Specimen>
  );
}
`;

      expect(sourceOf(code))
        .toBe(`import { Button } from "@tuja/ui/components/button";

<Button loading>Save</Button>`);
    });

    it("drops chrome nested below the first level", () => {
      const code = `${IMPORTS}import { PropsTable } from "../../props-table.tsx";

export function ButtonShowcase() {
  return (
    <Specimen caption="grid">
      <div>
        <Button>Go</Button>
        <PropsTable rows={[]} />
      </div>
    </Specimen>
  );
}
`;

      expect(sourceOf(code))
        .toBe(`import { Button } from "@tuja/ui/components/button";

<div>
  <Button>Go</Button>
</div>`);
    });

    it("drops chrome inside a local component the specimen reaches", () => {
      const code = `${IMPORTS}import { StateReadout } from "../../showcase.tsx";

export function ButtonShowcase() {
  return (
    <Specimen caption="live">
      <LiveButton />
    </Specimen>
  );
}

function LiveButton() {
  return (
    <div>
      <Button>Go</Button>
      <StateReadout label="onClick →">{count}</StateReadout>
    </div>
  );
}
`;

      expect(sourceOf(code))
        .toBe(`import { Button } from "@tuja/ui/components/button";

<LiveButton />

function LiveButton() {
  return (
    <div>
      <Button>Go</Button>
    </div>
  );
}`);
    });
  });

  describe("unwrapping t()", () => {
    it("prints a bare string for a whole child container", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="default">
      <Button>{t({ en: "Save", zh: "保存" })}</Button>
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toContain("<Button>Save</Button>");
    });

    it("prints a quoted string for an attribute", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="icon only">
      <Button aria-label={t({ en: "Delete", zh: "删除" })} />
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toContain('<Button aria-label="Delete" />');
    });

    it("prints a quoted string in an expression", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="joined">
      <Button>{[t({ en: "Save", zh: "保存" }), "now"].join(" ")}</Button>
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toContain('{["Save", "now"].join(" ")}');
    });

    it("never imports t itself", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="default">
      <Button>{t({ en: "Save", zh: "保存" })}</Button>
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).not.toContain("#src/i18n");
    });

    it("follows an aliased t import", () => {
      const code = `import { Button } from "@tuja/ui/components/button";
import { t as translate } from "#src/i18n.ts";
import { Specimen } from "../../specimen.tsx";

export function ButtonShowcase() {
  return (
    <Specimen caption="default">
      <Button>{translate({ en: "Save", zh: "保存" })}</Button>
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toContain("<Button>Save</Button>");
    });
  });

  describe("the import header", () => {
    it("emits only the imports the specimen uses, grouped by source", () => {
      const code = `import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Card, CardHeader } from "@tuja/ui/components/card";
import { Specimen } from "../../specimen.tsx";

export function CardShowcase() {
  return (
    <Specimen caption="slots">
      <Card>
        <CardHeader action={<Badge>New</Badge>}>Title</CardHeader>
      </Card>
    </Specimen>
  );
}
`;

      expect(sourceOf(code))
        .toBe(`import { Badge } from "@tuja/ui/components/badge";
import { Card, CardHeader } from "@tuja/ui/components/card";

<Card>
  <CardHeader action={<Badge>New</Badge>}>Title</CardHeader>
</Card>`);
    });

    it("orders external before #src before a relative path", () => {
      const code = `import { Button } from "@tuja/ui/components/button";
import { AnchorButton } from "#src/components/shared/anchor-button.tsx";
import { Specimen } from "../../specimen.tsx";
import { Plate } from "./plate.tsx";

export function Ordered() {
  return (
    <Specimen caption="order">
      <Plate>
        <AnchorButton href="#a" />
        <Button>Go</Button>
      </Plate>
    </Specimen>
  );
}
`;

      expect(sourceOf(code))
        .toContain(`import { Button } from "@tuja/ui/components/button";
import { AnchorButton } from "#src/components/shared/anchor-button.tsx";
import { Plate } from "./plate.tsx";`);
    });

    it("keeps a default, a namespace and a type import in their own form", () => {
      const code = `import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { Specimen } from "../../specimen.tsx";
import { useState, type ReactNode } from "react";

export function Mixed() {
  return (
    <Specimen caption="mixed">
      <Link href="#a" css={stylex.props(null)}>
        {useState<ReactNode>(null)[0]}
      </Link>
    </Specimen>
  );
}
`;

      const source = sourceOf(code);
      expect(source).toContain('import * as stylex from "@stylexjs/stylex";');
      expect(source).toContain('import Link from "next/link";');
      expect(source).toContain(
        'import { useState, type ReactNode } from "react";',
      );
    });

    it("wraps a long import the way prettier would", () => {
      const code = `import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";
import { Specimen } from "../../specimen.tsx";

export function TableShowcase() {
  return (
    <Specimen caption="plans">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Plan</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Plan 2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toContain(`import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";`);
    });

    it("keeps a lone specifier on one line however long the source is", () => {
      const code = `import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { Specimen } from "../../specimen.tsx";

export function IconShowcase() {
  return (
    <Specimen caption="icon">
      <SlidersHorizontalIcon weight="bold" />
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toContain(
        'import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";',
      );
    });
  });

  describe("local components", () => {
    it("appends a component the module declares, with its comment", () => {
      const code = `import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { Specimen } from "../../specimen.tsx";

/** A captioned cell. */
function SpecimenCell({ caption }: { caption: string }) {
  return <Text>{t({ en: "Cell", zh: "单元" })}: {caption}</Text>;
}

export function HooksShowcase() {
  return (
    <Specimen caption="cell">
      <SpecimenCell caption="uncontrolled" />
    </Specimen>
  );
}
`;

      expect(sourceOf(code))
        .toBe(`import { Text } from "@tuja/ui/components/text";

<SpecimenCell caption="uncontrolled" />

/** A captioned cell. */
function SpecimenCell({ caption }: { caption: string }) {
  return <Text>Cell: {caption}</Text>;
}`);
    });

    it("appends each referenced component once, in declaration order", () => {
      const code = `import { Specimen } from "../../specimen.tsx";

function Second() {
  return <span>second</span>;
}

function First() {
  return <span>first</span>;
}

export function Showcase() {
  return (
    <Specimen caption="two">
      <First />
      <Second />
      <First />
    </Specimen>
  );
}
`;

      const source = sourceOf(code);
      expect(source.match(/function Second/g)).toHaveLength(1);
      expect(source.indexOf("function Second")).toBeLessThan(
        source.indexOf("function First"),
      );
    });

    it("appends a component reached only through another component", () => {
      const code = `import { Specimen } from "../../specimen.tsx";

function Inner() {
  return <span>inner</span>;
}

function Outer() {
  return <Inner />;
}

export function Showcase() {
  return (
    <Specimen caption="one">
      <Outer />
    </Specimen>
  );
}
`;

      const source = sourceOf(code);
      expect(source).toContain("function Outer");
      expect(source).toContain("function Inner()");
    });

    it("carries the imports of a component reached through another", () => {
      const code = `import { Text } from "@tuja/ui/components/text";
import { Specimen } from "../../specimen.tsx";

function Inner() {
  return <Text>inner</Text>;
}

function Outer() {
  return <Inner />;
}

export function Showcase() {
  return (
    <Specimen caption="one">
      <Outer />
    </Specimen>
  );
}
`;

      expect(sourceOf(code)).toContain(
        'import { Text } from "@tuja/ui/components/text";',
      );
    });

    it("emits one copy when two components reach the same third", () => {
      const code = `import { Specimen } from "../../specimen.tsx";

function Shared() {
  return <span>shared</span>;
}

function Left() {
  return <Shared />;
}

function Right() {
  return <Shared />;
}

export function Showcase() {
  return (
    <Specimen caption="diamond">
      <Left />
      <Right />
    </Specimen>
  );
}
`;

      const source = sourceOf(code);
      expect(source.match(/function Shared/g)).toHaveLength(1);
      expect(source.match(/function Left/g)).toHaveLength(1);
      expect(source.match(/function Right/g)).toHaveLength(1);
    });

    it("terminates on a cycle, emitting each component once", () => {
      const code = `import { Specimen } from "../../specimen.tsx";

function Ping({ depth }: { depth: number }) {
  return depth > 0 ? <Pong depth={depth - 1} /> : null;
}

function Pong({ depth }: { depth: number }) {
  return <Ping depth={depth} />;
}

export function Showcase() {
  return (
    <Specimen caption="cycle">
      <Ping depth={2} />
    </Specimen>
  );
}
`;

      const source = sourceOf(code);
      expect(source.match(/function Ping/g)).toHaveLength(1);
      expect(source.match(/function Pong/g)).toHaveLength(1);
    });

    it("keeps declaration order however deep the chain runs", () => {
      const code = `import { Specimen } from "../../specimen.tsx";

function Third() {
  return <span>third</span>;
}

function Second() {
  return <Third />;
}

function First() {
  return <Second />;
}

export function Showcase() {
  return (
    <Specimen caption="chain">
      <First />
    </Specimen>
  );
}
`;

      const source = sourceOf(code);
      expect(source.indexOf("function Third")).toBeLessThan(
        source.indexOf("function Second"),
      );
      expect(source.indexOf("function Second")).toBeLessThan(
        source.indexOf("function First"),
      );
    });
  });

  describe("UsageSnippet", () => {
    it("tokenises a template literal passed inline", () => {
      const code = `import { UsageSnippet } from "../../usage-snippet.tsx";

export function ButtonShowcase() {
  return (
    <UsageSnippet
      code={\`import { Button } from "@tuja/ui/components/button";

<Button variant="primary">Add</Button>\`}
      label="tsx"
    />
  );
}
`;

      expect(sourceOf(code, "UsageSnippet"))
        .toBe(`import { Button } from "@tuja/ui/components/button";

<Button variant="primary">Add</Button>`);
    });

    it("resolves a module-level constant", () => {
      const code = `import { UsageSnippet } from "../../usage-snippet.tsx";

const USAGE = \`import { TextField } from "@tuja/ui/components/text-field";\`;

export function TextFieldShowcase() {
  return <UsageSnippet code={USAGE} />;
}
`;

      expect(sourceOf(code, "UsageSnippet")).toBe(
        'import { TextField } from "@tuja/ui/components/text-field";',
      );
    });

    it("skips a code prop it cannot read", () => {
      const code = `import { UsageSnippet } from "../../usage-snippet.tsx";

export function Dynamic({ snippet }: { snippet: string }) {
  return <UsageSnippet code={snippet} />;
}
`;

      expect(collect(code)).toHaveLength(0);
    });

    it("tokenises a snippet nested inside a specimen it was dropped from", () => {
      const code = `import { Button } from "@tuja/ui/components/button";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function ButtonShowcase() {
  return (
    <Specimen caption="default">
      <Button>Go</Button>
      <UsageSnippet code="const a = 1;" />
    </Specimen>
  );
}
`;

      expect(sourceOf(code, "Specimen")).not.toContain("UsageSnippet");
      expect(sourceOf(code, "UsageSnippet")).toBe("const a = 1;");
    });
  });

  describe("a snippet that does not parse", () => {
    const code = `import { UsageSnippet } from "../../usage-snippet.tsx";

export function Install() {
  return <UsageSnippet code="pnpm add --save-dev @tuja/ui" />;
}
`;

    it("fails with a code frame that points at the element", () => {
      expect(() => collect(code)).toThrow("showcase.tsx: [specimen-source]");
      expect(() => collect(code)).toThrow(
        '> 4 |   return <UsageSnippet code="pnpm add --save-dev @tuja/ui" />;',
      );
    });

    it("keeps the tokeniser error, and the parse error under it, as causes", () => {
      try {
        collect(code);
        expect.unreachable("the transform should have thrown");
      } catch (error) {
        expect(error.cause.message).toContain("not valid TSX");
        expect(error.cause.cause).toBeInstanceOf(Error);
      }
    });
  });

  describe("the token array", () => {
    it("holds a kind and a text for every run", () => {
      const code = `${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="primary">
      <Button variant="primary">Go</Button>
    </Specimen>
  );
}
`;

      const [{ tokens }] = collect(code);
      expect(tokens).toContainEqual(["component", "Button"]);
      expect(tokens).toContainEqual(["attr", "variant"]);
      expect(tokens).toContainEqual(["keyword", "import"]);
    });
  });
});

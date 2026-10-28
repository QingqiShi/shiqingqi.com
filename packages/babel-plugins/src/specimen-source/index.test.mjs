import { createRequire } from "node:module";
import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pluginPath = require.resolve("./index");

/**
 * Run the plugin and collect every `source` prop it injected.
 *
 * The capture plugin runs second, so it sees the props the first plugin added
 * in `pre()`.
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
    <Showcase label={t({ en: "Looks", zh: "外观" })}>
      <Specimen caption="primary">
        <Button look="primary">{t({ en: "Primary", zh: "主要" })}</Button>
      </Specimen>
    </Showcase>
  );
}
`;

      expect(sourceOf(code))
        .toBe(`import { Button } from "@tuja/ui/components/button";

<Button look="primary">Primary</Button>`);
    });
  });

  describe("unwrapping t()", () => {
    it("reads t() before React Compiler and the i18n plugin rewrite it", () => {
      const code = `"use client";
${IMPORTS}
export function ButtonShowcase() {
  return (
    <Specimen caption="default">
      <Button>{t({ en: "Save", zh: "保存" })}</Button>
    </Specimen>
  );
}
`;

      const result = transformSync(code, {
        filename: "showcase.tsx",
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [
          require.resolve("babel-plugin-react-compiler"),
          pluginPath,
          require.resolve("../i18n/index"),
        ],
        configFile: false,
        babelrc: false,
      });

      // React Compiler moves the token array into a cache slot, so read it
      // from the output text.
      expect(result?.code).toContain(
        '["punct", ">"], ["plain", "Save"], ["punct", "</"]',
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
  });
});

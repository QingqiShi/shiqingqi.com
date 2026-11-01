import { createRequire } from "node:module";
import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pluginPath = require.resolve("./index");
const i18nPluginPath = require.resolve("../i18n/index");
const { generateKey } = require("../i18n/generate-key");

/**
 * @typedef {import("@babel/types").Expression} Expression
 * @typedef {"en" | "zh"} Locale
 */

/**
 * Run the plugins and collect, for every `source` prop the specimen-source
 * plugin injected, the expression that gives each token its text.
 *
 * The capture plugin runs last, so it sees the props the other plugins wrote
 * in `pre()`.
 * @param {string} code
 * @param {import("@babel/core").PluginItem[]} plugins
 * @returns {{ element: string, texts: Expression[] }[]}
 */
function collect(code, plugins) {
  /** @type {{ element: string, texts: Expression[] }[]} */
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
        /** @type {Expression[]} */
        const texts = [];
        for (const pair of array.elements) {
          if (!t.isArrayExpression(pair)) continue;
          const text = pair.elements[1];
          if (t.isExpression(text)) texts.push(text);
        }
        found.push({ element: element.name, texts });
      },
    },
  });

  const result = transformSync(code, {
    filename: "showcase.tsx",
    parserOpts: { plugins: ["typescript", "jsx"] },
    plugins: [...plugins, capture],
    configFile: false,
    babelrc: false,
  });
  if (!result) throw new Error("Transform returned no result");
  return found;
}

/**
 * The text of one token in one locale.
 * @param {Expression} node
 * @param {(call: import("@babel/types").CallExpression) => string} call What
 *   a call in the token gives.
 * @returns {string}
 */
function readText(node, call) {
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "BinaryExpression" && node.left.type !== "PrivateName") {
    return readText(node.left, call) + readText(node.right, call);
  }
  if (node.type === "CallExpression") return call(node);
  throw new Error(`Unexpected ${node.type} in a source token`);
}

/**
 * The `{ en, zh }` texts of a `t()` call.
 * @param {import("@babel/types").CallExpression} node
 * @returns {Record<Locale, string>}
 */
function translationsOf(node) {
  const [argument] = node.arguments;
  /** @type {Record<string, string>} */
  const texts = {};
  if (argument?.type === "ObjectExpression") {
    for (const property of argument.properties) {
      if (
        property.type === "ObjectProperty" &&
        property.key.type === "Identifier" &&
        property.value.type === "StringLiteral"
      ) {
        texts[property.key.name] = property.value.value;
      }
    }
  }
  if (texts.en === undefined || texts.zh === undefined) {
    throw new Error("A t() call without en and zh texts");
  }
  return { en: texts.en, zh: texts.zh };
}

/**
 * The first injected source on an element, read back in one locale.
 * @param {string} code
 * @param {string} [element]
 * @param {Locale} [locale]
 * @returns {string}
 */
function sourceOf(code, element = "Specimen", locale = "en") {
  const match = collect(code, [pluginPath]).find(
    (one) => one.element === element,
  );
  if (!match) throw new Error(`No source prop on <${element}>`);
  return match.texts
    .map((text) => readText(text, (call) => translationsOf(call)[locale]))
    .join("");
}

/**
 * The same, after the i18n transform has compiled each `t()` to a lookup.
 * @param {string} code
 * @param {string} element
 * @param {Locale} locale
 * @returns {string}
 */
function compiledSourceOf(code, element, locale) {
  /** @type {Map<string, string>} */
  const bundle = new Map();
  for (const { texts } of collect(code, [pluginPath])) {
    for (const text of texts) {
      readText(text, (call) => {
        const { en, zh } = translationsOf(call);
        bundle.set(generateKey(en, zh), locale === "en" ? en : zh);
        return "";
      });
    }
  }

  const match = collect(code, [pluginPath, i18nPluginPath]).find(
    (one) => one.element === element,
  );
  if (!match) throw new Error(`No source prop on <${element}>`);
  return match.texts
    .map((text) =>
      readText(text, (call) => {
        const key = call.arguments.at(-1);
        const value =
          key?.type === "StringLiteral" ? bundle.get(key.value) : undefined;
        if (value === undefined) throw new Error("A lookup with no key");
        return value;
      }),
    )
    .join("");
}

const IMPORTS = `import { Button } from "@tuja/ui/components/button";
import { t } from "@tuja/i18n";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
`;

describe("specimen-source", () => {
  describe("what it injects", () => {
    it("gives a Specimen the source of its children in each locale", () => {
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

      const header = `import { Button } from "@tuja/ui/components/button";\n\n`;
      expect(compiledSourceOf(code, "Specimen", "en")).toBe(
        `${header}<Button look="primary">Primary</Button>`,
      );
      expect(compiledSourceOf(code, "Specimen", "zh")).toBe(
        `${header}<Button look="primary">主要</Button>`,
      );
    });

    it("gives an Example the source of its children in each locale", () => {
      const code = `import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Example } from "../../example.tsx";

export function ShareExample() {
  return (
    <Example>
      <Button label={t({ en: "Share", zh: "分享" })}>
        {t({ en: "Share trip", zh: "分享行程" })}
      </Button>
    </Example>
  );
}
`;

      const header = `import { Button } from "@tuja/ui/components/button";\n\n`;
      expect(compiledSourceOf(code, "Example", "en")).toBe(
        `${header}<Button label="Share">\n  Share trip\n</Button>`,
      );
      expect(compiledSourceOf(code, "Example", "zh")).toBe(
        `${header}<Button label="分享">\n  分享行程\n</Button>`,
      );
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
          i18nPluginPath,
        ],
        configFile: false,
        babelrc: false,
      });

      // React Compiler moves each token into a cache slot, so count the
      // lookups in the output text: one for the button, one for its source.
      const lookup = `i18nLookup(_translations, "${generateKey("Save", "保存")}")`;
      expect(result?.code.split(lookup)).toHaveLength(3);
    });
  });

  describe("local components", () => {
    it("appends a component the module declares, with its comment", () => {
      const code = `import { Text } from "@tuja/ui/components/text";
import { t } from "@tuja/i18n";
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

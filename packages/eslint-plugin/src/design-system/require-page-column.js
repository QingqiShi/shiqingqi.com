"use strict";

/** A module that exports the `layout` consts, such as `@tuja/ui/tokens.stylex`. */
const TOKENS_SOURCE = /(?:^|\/)tokens\.stylex(?:\.ts)?$/;

/** The module that exports `pageColumnTokens`. */
const PAGE_COLUMN_SOURCE = /(?:^|\/)page-column\.stylex(?:\.ts)?$/;

/** A left or right safe-area inset. Top and bottom insets clear page chrome. */
const INLINE_SAFE_AREA = /env\(\s*safe-area-inset-(left|right)\b/;

/**
 * The name of a member, for `a.b` and for `a["b"]`.
 * @param {import("estree").MemberExpression} node
 */
function getPropertyName(node) {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  if (node.property.type === "Literal") return String(node.property.value);
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
const requirePageColumn = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require the page column and the page gutter from `@tuja/ui`, instead of `layout.maxInlineSize`, a width of the page column or an inline safe-area inset by hand",
    },
    messages: {
      maxInlineSize:
        "`layout.maxInlineSize` builds a page column by hand. Compose `pageColumn.base` from `@tuja/ui/primitives/page-column.stylex`: the box spans its parent and sets its content in the page column, with the page gutter and the safe area. `HeaderFooterLayout` with `pageColumn`, a `NavigationSplitView` and a `NavigationStack` already do this.",
      columnWidth:
        "Setting `pageColumnTokens.inlineSize` makes a width of the page column that no other screen shares. Compose a named width from `@tuja/ui/primitives/page-column.stylex`: `pageColumn.regular` for the default width, `pageColumn.list` for a screen of rows, `pageColumn.settings` for a settings section, `pageColumn.report` for a report, or `pageColumn.wide` for a gallery of cards. Pass it in the `css` of a `NavigationSplitView` or a `NavigationStack`, or of a `TabView` for all of its screens.",
      safeArea:
        "`env(safe-area-inset-{{side}})` builds a page gutter by hand. Compose `pageColumn.base` or `pageColumn.scroller` from `@tuja/ui/primitives/page-column.stylex` to set content in the page column, add `pageColumn.wide` for a gallery of cards that keeps only the page gutter, or take `pageGutter.inlineStart` or `pageGutter.inlineEnd` for one gutter.",
    },
    schema: [],
  },

  create(context) {
    /** Local names bound to the `layout` consts. */
    const layoutNames = new Set();
    /** Local names bound to `pageColumnTokens`. */
    const columnTokenNames = new Set();

    /**
     * @param {import("estree").Node} node
     * @param {string} text
     */
    function checkText(node, text) {
      const match = INLINE_SAFE_AREA.exec(text);
      if (match === null) return;
      context.report({ node, messageId: "safeArea", data: { side: match[1] } });
    }

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== "string") return;
        const [names, exported] = TOKENS_SOURCE.test(node.source.value)
          ? [layoutNames, "layout"]
          : PAGE_COLUMN_SOURCE.test(node.source.value)
            ? [columnTokenNames, "pageColumnTokens"]
            : [null, null];
        if (names === null) return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === exported
          ) {
            names.add(specifier.local.name);
          }
        }
      },
      Property(node) {
        if (!node.computed || node.key.type !== "MemberExpression") return;
        if (node.key.object.type !== "Identifier") return;
        if (!columnTokenNames.has(node.key.object.name)) return;
        if (getPropertyName(node.key) !== "inlineSize") return;
        context.report({ node, messageId: "columnWidth" });
      },
      MemberExpression(node) {
        if (node.object.type !== "Identifier") return;
        if (!layoutNames.has(node.object.name)) return;
        if (getPropertyName(node) !== "maxInlineSize") return;
        context.report({ node, messageId: "maxInlineSize" });
      },
      Literal(node) {
        if (typeof node.value === "string") checkText(node, node.value);
      },
      TemplateElement(node) {
        checkText(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

module.exports = requirePageColumn;

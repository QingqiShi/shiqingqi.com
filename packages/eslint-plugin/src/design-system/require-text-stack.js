"use strict";

/** Elements that hold one line of text, or one paragraph, and nothing else. */
const TEXT_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "time",
  "small",
]);

/** Components that render text alone. */
const TEXT_COMPONENTS = new Set(["Heading", "Text"]);

/**
 * Elements that are text when they take a type role. A `label` is not here,
 * because it often holds its control.
 */
const TYPED_TAGS = new Set(["span", "div", "strong", "em"]);

/**
 * Type roles of a heading at h2 size or larger. Their line height is so small
 * that their letters fill their line box.
 */
const LARGE_ROLES = new Set([
  "display",
  "subDisplay",
  "h1",
  "h2",
  "fluidDisplay",
  "fluidH1",
  "fluidH2",
]);

/** A card title grows with its container, so it is large in some cards only. */
const SIZED_BY_CONTAINER_ROLES = new Set(["cardTitle"]);

/** `Heading` looks of a heading at h2 size or larger. */
const LARGE_LOOKS = new Set(["display", "h1", "h2"]);

/**
 * Roles and `Text` looks of a small line above a title. Their line height is
 * 1.3, so the letters of two such lines in a row would almost touch.
 */
const EYEBROW_ROLES = new Set(["label", "caption", "overline"]);

/** Type roles of a heading of any size. */
const HEADING_ROLES = new Set([
  "display",
  "subDisplay",
  "h1",
  "h2",
  "h3",
  "h4",
  "fluidDisplay",
  "fluidH1",
  "fluidH2",
  "fluidH3",
  "cardTitle",
]);

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/**
 * The style expressions an element applies: the `css` prop, or the arguments
 * of a spread `stylex.props(...)`.
 * @param {import("estree-jsx").JSXOpeningElement} opening
 * @returns {import("estree").Node[]}
 */
function getAppliedStyles(opening) {
  const styles = [];
  for (const attribute of opening.attributes) {
    if (
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === "css" &&
      attribute.value?.type === "JSXExpressionContainer"
    ) {
      const expression = attribute.value.expression;
      if (expression.type === "ArrayExpression") {
        styles.push(...expression.elements.filter((element) => element));
      } else {
        styles.push(expression);
      }
    }
    if (
      attribute.type === "JSXSpreadAttribute" &&
      attribute.argument.type === "CallExpression" &&
      attribute.argument.callee.type === "MemberExpression" &&
      attribute.argument.callee.object.type === "Identifier" &&
      attribute.argument.callee.object.name === "stylex" &&
      attribute.argument.callee.property.type === "Identifier" &&
      attribute.argument.callee.property.name === "props"
    ) {
      styles.push(...attribute.argument.arguments);
    }
  }
  return styles;
}

/**
 * The key of a style in a namespace, such as `tight` for `stack.tight`.
 * @param {import("estree").Node} style
 * @param {string} namespace
 * @returns {string | null}
 */
function getStyleKey(style, namespace) {
  if (
    style.type === "MemberExpression" &&
    !style.computed &&
    style.object.type === "Identifier" &&
    style.object.name === namespace &&
    style.property.type === "Identifier"
  ) {
    return style.property.name;
  }
  return null;
}

/**
 * Whether a JSX element is one line of text: a text tag, `Heading`, `Text`, or
 * an inline or block element that takes a type role.
 * @param {import("estree-jsx").JSXElement} element
 */
function isTextLine(element) {
  const name = element.openingElement.name;
  if (name.type !== "JSXIdentifier") return false;
  if (TEXT_TAGS.has(name.name) || TEXT_COMPONENTS.has(name.name)) return true;
  if (!TYPED_TAGS.has(name.name)) return false;
  return getAppliedStyles(element.openingElement).some(
    (style) => getStyleKey(style, "typeRole") !== null,
  );
}

/**
 * The value of a JSX attribute when it is a string or number literal,
 * `undefined` when the attribute is absent, and `null` when it is not known.
 * @param {import("estree-jsx").JSXOpeningElement} opening
 * @param {string} name
 * @returns {string | number | null | undefined}
 */
function getLiteralAttribute(opening, name) {
  const attribute = opening.attributes.find(
    (candidate) =>
      candidate.type === "JSXAttribute" &&
      candidate.name.type === "JSXIdentifier" &&
      candidate.name.name === name,
  );
  if (attribute === undefined) return undefined;
  const value =
    attribute.value?.type === "JSXExpressionContainer"
      ? attribute.value.expression
      : attribute.value;
  if (value?.type === "Literal" && typeof value.value !== "boolean") {
    return value.value;
  }
  return null;
}

/**
 * Whether a line of text is a heading at h2 size or larger: `"large"`,
 * `"small"`, or `"unknown"` for a heading tag that sets its size elsewhere.
 * @param {import("estree-jsx").JSXElement} element
 * @returns {"large" | "small" | "unknown"}
 */
function getLineSize(element) {
  const opening = element.openingElement;
  const roles = getAppliedStyles(opening)
    .map((style) => getStyleKey(style, "typeRole"))
    .filter((role) => role !== null);
  if (roles.length > 0) {
    const role = roles.at(-1);
    if (SIZED_BY_CONTAINER_ROLES.has(role)) return "unknown";
    return LARGE_ROLES.has(role) ? "large" : "small";
  }
  const name = opening.name.type === "JSXIdentifier" ? opening.name.name : "";
  if (name === "Heading") {
    const look = getLiteralAttribute(opening, "look");
    if (look === null) return "unknown";
    if (look !== undefined) return LARGE_LOOKS.has(look) ? "large" : "small";
    const level = getLiteralAttribute(opening, "level") ?? 2;
    if (level === null) return "unknown";
    return Number(level) <= 2 ? "large" : "small";
  }
  return ["h1", "h2"].includes(name) ? "unknown" : "small";
}

/**
 * The type role of a line, from its styles or from the `look` of a `Text`.
 * @param {import("estree-jsx").JSXElement} element
 * @returns {string | null}
 */
function getRole(element) {
  const opening = element.openingElement;
  const roles = getAppliedStyles(opening)
    .map((style) => getStyleKey(style, "typeRole"))
    .filter((role) => role !== null);
  if (roles.length > 0) return roles.at(-1);
  if (opening.name.type === "JSXIdentifier" && opening.name.name === "Text") {
    const look = getLiteralAttribute(opening, "look");
    return typeof look === "string" ? look : null;
  }
  return null;
}

/**
 * Whether a line is a small line above a title: `label`, `caption` or
 * `overline`.
 * @param {import("estree-jsx").JSXElement} element
 */
function isEyebrow(element) {
  const role = getRole(element);
  return role !== null && EYEBROW_ROLES.has(role);
}

/**
 * Whether a line is a heading of any size: a heading role, `Heading` with any
 * look, or a heading tag that takes no other type role.
 * @param {import("estree-jsx").JSXElement} element
 */
function isHeading(element) {
  const opening = element.openingElement;
  const name = opening.name.type === "JSXIdentifier" ? opening.name.name : "";
  const role = getRole(element);
  if (role !== null && name !== "Text") return HEADING_ROLES.has(role);
  if (role !== null) return false;
  return name === "Heading" || HEADING_TAGS.has(name);
}

/**
 * Whether a small line comes directly before a heading.
 * @param {import("estree-jsx").JSXElement[]} lines
 */
function hasEyebrowPair(lines) {
  return lines.some(
    (line, index) =>
      index > 0 && isHeading(line) && isEyebrow(lines[index - 1]),
  );
}

/**
 * The text lines a child can render: the text element, or each branch of a
 * condition that renders a text element or nothing. Returns `null` for any
 * other child, because its content is not known.
 * @param {import("estree-jsx").JSXElement["children"][number]} child
 * @returns {import("estree-jsx").JSXElement[] | null}
 */
function getTextLines(child) {
  if (child.type === "JSXText") return child.value.trim() === "" ? [] : null;
  if (child.type === "JSXElement") return isTextLine(child) ? [child] : null;
  if (child.type !== "JSXExpressionContainer") return null;
  const expression = child.expression;
  if (expression.type === "JSXEmptyExpression") return [];
  const branches =
    expression.type === "LogicalExpression" && expression.operator === "&&"
      ? [expression.right]
      : expression.type === "ConditionalExpression"
        ? [expression.consequent, expression.alternate]
        : [expression];
  const lines = [];
  for (const branch of branches) {
    if (branch.type === "Literal" && branch.value === null) continue;
    if (branch.type !== "JSXElement" || !isTextLine(branch)) return null;
    lines.push(branch);
  }
  return lines.length > 0 ? lines : null;
}

/** @type {import("eslint").Rule.RuleModule} */
const requireTextStack = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require lines of text in one item to take `stack.text`, a heading at h2 size or larger to take a gap to its text, and a small line (`label`, `caption`, `overline`) directly above a heading to take `stack.tight`",
    },
    messages: {
      textStack:
        "`stack.tight` puts a gap between lines of text in one item. A line box already holds space above and below its letters, so the lines look as far apart as two items. Compose `stack.text`. Two paragraphs are two items, so they take `stack.item`.",
      eyebrowStack:
        "A `label`, `caption` or `overline` line has a line height of 1.3 and a heading about 1.2, so with no gap the small line touches the heading under it. Compose `stack.tight`. This is the one case of small lines that takes a gap.",
      headingStack:
        "A heading at h2 size or larger fills its line box with its letters, so with no gap it touches its text. Compose `stack.tight`, or `stack.item` for a display heading.",
    },
    schema: [],
  },

  create(context) {
    return {
      JSXElement(node) {
        const stack = getAppliedStyles(node.openingElement).find((style) =>
          ["tight", "text"].includes(getStyleKey(style, "stack")),
        );
        if (stack === undefined) return;
        const lines = [];
        let count = 0;
        for (const child of node.children) {
          const childLines = getTextLines(child);
          if (childLines === null) return;
          if (childLines.length > 0) count += 1;
          lines.push(...childLines);
        }
        if (count < 2) return;
        const sizes = lines.map(getLineSize);
        if (getStyleKey(stack, "stack") === "text") {
          if (sizes.includes("large")) {
            context.report({ node: stack, messageId: "headingStack" });
          } else if (hasEyebrowPair(lines)) {
            context.report({ node: stack, messageId: "eyebrowStack" });
          }
          return;
        }
        if (sizes.every((size) => size === "small") && !hasEyebrowPair(lines)) {
          context.report({ node: stack, messageId: "textStack" });
        }
      },
    };
  },
};

module.exports = requireTextStack;

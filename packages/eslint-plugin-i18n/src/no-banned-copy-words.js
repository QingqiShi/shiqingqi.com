/**
 * ESLint rule: no-banned-copy-words
 *
 * Flags t() calls whose `en` copy uses a word DESIGN.md's "Words that don't
 * ship" list excludes from shipped copy. Only `en` is checked — `zh` carries
 * its own voice and is out of scope for this list.
 */

"use strict";

const { createTImportTracker } = require("./create-t-import-tracker.js");

const BANNED_WORDS = [
  "simply",
  "just",
  "easy",
  "oops",
  "sorry",
  "please",
  "click here",
  "here",
  "invalid",
  "illegal",
  "forbidden",
  "powerful",
  "seamless",
  "effortless",
];

/** @param {string} word */
function escapeRegExp(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BANNED_WORD_PATTERNS = BANNED_WORDS.map((word) => ({
  word,
  pattern: new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"),
}));

/**
 * HTML/ARIA attribute names that happen to contain a banned word as a
 * substring of the literal attribute name, not as prose. Copy documenting
 * accessibility behaviour (e.g. "...sets aria-invalid...") legitimately
 * names these attributes, so they're stripped before banned-word matching.
 */
const EXEMPT_ATTRIBUTE_NAMES = ["aria-invalid"];

const EXEMPT_ATTRIBUTE_PATTERN = new RegExp(
  `\\b(?:${EXEMPT_ATTRIBUTE_NAMES.map(escapeRegExp).join("|")})\\b`,
  "gi",
);

/**
 * Find the first banned word/phrase present in the text, checked in list order
 * so multi-word phrases (e.g. "click here") are reported ahead of the single
 * word ("here") they contain. Attribute names in `EXEMPT_ATTRIBUTE_NAMES` are
 * stripped first so the banned word they contain isn't matched.
 * @param {string} text
 * @returns {string | null}
 */
function findBannedWord(text) {
  const withoutExemptAttributes = text.replace(EXEMPT_ATTRIBUTE_PATTERN, "");
  for (const { word, pattern } of BANNED_WORD_PATTERNS) {
    if (pattern.test(withoutExemptAttributes)) {
      return word;
    }
  }
  return null;
}

/**
 * Get the literal string value of an `en` property value, if it is a plain
 * string literal or a template literal with no interpolated expressions.
 * @param {import("eslint").Rule.Node} valueNode
 * @returns {string | null}
 */
function getStaticStringValue(valueNode) {
  if (valueNode.type === "Literal" && typeof valueNode.value === "string") {
    return valueNode.value;
  }
  if (
    valueNode.type === "TemplateLiteral" &&
    valueNode.expressions.length === 0
  ) {
    return valueNode.quasis.map((quasi) => quasi.value.cooked).join("");
  }
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
const noBannedCopyWords = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow words DESIGN.md's \"Words that don't ship\" list excludes from t() en copy",
    },
    messages: {
      bannedWord:
        '"{{word}}" is on DESIGN.md\'s "Words that don\'t ship" list. Rewrite the en copy without it.',
    },
    schema: [],
  },

  create(context) {
    const { tracker, handleImportDeclaration } = createTImportTracker();

    return {
      ImportDeclaration: handleImportDeclaration,

      CallExpression(node) {
        if (!tracker.imported) return;
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== tracker.localName
        ) {
          return;
        }

        const [arg] = node.arguments;
        if (!arg || arg.type !== "ObjectExpression") return;

        const enProperty = arg.properties.find(
          (property) =>
            property.type === "Property" &&
            property.key.type === "Identifier" &&
            property.key.name === "en",
        );
        if (!enProperty) return;

        const text = getStaticStringValue(enProperty.value);
        if (text === null) return;

        const bannedWord = findBannedWord(text);
        if (bannedWord) {
          context.report({
            node: enProperty.value,
            messageId: "bannedWord",
            data: { word: bannedWord },
          });
        }
      },
    };
  },
};

module.exports = noBannedCopyWords;

"use client";

import * as stylex from "@stylexjs/stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useCallback, useMemo, useState } from "react";

type TokenKind = "keyword" | "type" | "string" | "comment" | "number" | "plain";

interface Token {
  kind: TokenKind;
  value: string;
  key: string;
}

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "namespace",
  "new",
  "null",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "yield",
]);

const BUILTIN_TYPES = new Set([
  "Array",
  "Date",
  "DOMException",
  "Error",
  "Generator",
  "Infinity",
  "Iterable",
  "Iterator",
  "Map",
  "Math",
  "NaN",
  "Object",
  "Promise",
  "PromiseLike",
  "PromiseSettledResult",
  "ReadonlyArray",
  "ReadonlyMap",
  "Record",
  "RegExp",
  "ReturnType",
  "Set",
  "Symbol",
  "WeakKey",
  "WeakMap",
  "WeakSet",
  "any",
  "boolean",
  "never",
  "number",
  "object",
  "string",
  "unknown",
]);

const IDENT_START = /[A-Za-z_$]/;
const IDENT_CONT = /[A-Za-z0-9_$]/;
const DIGIT_CONT = /[0-9._]/;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let plain = "";
  let plainStart = 0;

  const startPlain = (at: number): void => {
    if (plain === "") plainStart = at;
  };

  const flushPlain = (): void => {
    if (plain) {
      tokens.push({
        kind: "plain",
        value: plain,
        key: `p:${plainStart.toString()}`,
      });
      plain = "";
    }
  };

  while (cursor < source.length) {
    const ch = source[cursor];
    const next = source[cursor + 1];

    if (ch === "/" && next === "/") {
      flushPlain();
      let end = source.indexOf("\n", cursor);
      if (end === -1) end = source.length;
      tokens.push({
        kind: "comment",
        value: source.slice(cursor, end),
        key: `c:${cursor.toString()}`,
      });
      cursor = end;
      continue;
    }

    if (ch === "/" && next === "*") {
      flushPlain();
      const end = source.indexOf("*/", cursor + 2);
      const stop = end === -1 ? source.length : end + 2;
      tokens.push({
        kind: "comment",
        value: source.slice(cursor, stop),
        key: `c:${cursor.toString()}`,
      });
      cursor = stop;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      flushPlain();
      const quote = ch;
      let j = cursor + 1;
      while (j < source.length) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({
        kind: "string",
        value: source.slice(cursor, j),
        key: `s:${cursor.toString()}`,
      });
      cursor = j;
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      flushPlain();
      let j = cursor;
      while (j < source.length && DIGIT_CONT.test(source[j])) j++;
      tokens.push({
        kind: "number",
        value: source.slice(cursor, j),
        key: `n:${cursor.toString()}`,
      });
      cursor = j;
      continue;
    }

    if (IDENT_START.test(ch)) {
      const wordStart = cursor;
      let j = cursor;
      while (j < source.length && IDENT_CONT.test(source[j])) j++;
      const word = source.slice(cursor, j);
      if (KEYWORDS.has(word)) {
        flushPlain();
        tokens.push({
          kind: "keyword",
          value: word,
          key: `k:${wordStart.toString()}`,
        });
      } else if (BUILTIN_TYPES.has(word)) {
        flushPlain();
        tokens.push({
          kind: "type",
          value: word,
          key: `t:${wordStart.toString()}`,
        });
      } else {
        startPlain(wordStart);
        plain += word;
      }
      cursor = j;
      continue;
    }

    startPlain(cursor);
    plain += ch;
    cursor++;
  }
  flushPlain();
  return tokens;
}

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const tokens = useMemo(() => tokenize(code), [code]);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1200);
    });
  }, [code]);

  return (
    <div css={styles.wrapper}>
      <button
        type="button"
        onClick={handleCopy}
        css={[buttonReset.base, transition.colors, styles.copyButton]}
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre css={styles.pre}>
        <code css={styles.code}>
          {tokens.map((tok) => (
            <span key={tok.key} css={tokenStyles[tok.kind]}>
              {tok.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const tokenStyles = stylex.create({
  keyword: { color: color.textAccent, fontWeight: font.weight_5 },
  type: { color: color.info },
  string: { color: color.success },
  comment: { color: color.textSubtle, fontStyle: "italic" },
  number: { color: color.warning },
  plain: { color: color.textMain },
});

const styles = stylex.create({
  wrapper: {
    position: "relative",
    borderRadius: border.radius_2,
    backgroundColor: color.backgroundSunken,
    border: `1px solid ${color.borderSubtle}`,
    overflow: "hidden",
  },
  copyButton: {
    position: "absolute",
    top: space._1,
    insetInlineEnd: space._1,
    paddingBlock: space._0,
    paddingInline: space._2,
    minBlockSize: "32px",
    borderRadius: border.radius_1,
    fontSize: font.uiCaption,
    fontFamily: font.familyMono,
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: color.backgroundElevated,
      ":hover": color.backgroundHover,
    },
    border: `1px solid ${color.borderSubtle}`,
    cursor: "pointer",
    zIndex: 1,
  },
  pre: {
    margin: 0,
    paddingBlock: space._3,
    paddingInline: space._3,
    paddingInlineEnd: space._8,
    overflowX: "auto",
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_2,
  },
  code: {
    fontFamily: font.familyMono,
    whiteSpace: "pre",
  },
});

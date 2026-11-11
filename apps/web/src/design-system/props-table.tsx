import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocale } from "@tuja/i18n/server-locale";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { PropDoc, PropsDoc } from "@tuja/props-codegen/types";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { codeRun } from "@tuja/ui/components/code-run.stylex";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";
import { TableDisclosureTrigger } from "@tuja/ui/components/table-disclosure-trigger";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  controlHeight,
  font,
  measure,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { Fragment, type ReactNode } from "react";
import { PROPS_DOCS } from "#src/_generated/props/index.ts";
import { firstSentence } from "./first-sentence.ts";
import { Identifier } from "./identifier.tsx";
import { PropAnchors } from "./prop-anchors.tsx";
import { PropRow } from "./prop-row.tsx";
import { Showcase } from "./showcase.tsx";
import { typeTokens, type TypeTokenKind } from "./type-tokens.ts";

interface PropsTableProps {
  /**
   * The component's or hook's export subpath — `"button"`, `"card-header"`,
   * `"use-ripple"`.
   */
  component: string;
}

/**
 * One component's props, or one hook's options, read from the generated
 * documents rather than written by hand: the summary of each prop's own JSDoc,
 * localised by the page's locale. Each prop is one row of one line: its name,
 * its type and the first sentence of its description. A press on the row
 * opens the whole description under it. On a narrow screen the table scrolls
 * sideways under the column of names.
 */
export function PropsTable({ component }: PropsTableProps) {
  const doc = PROPS_DOCS[component];
  const locale = getLocale();
  const isHook = doc.kind === "hook";
  const requiredLabel = t({ en: "Required", zh: "必填" });
  const deprecatedLabel = t({ en: "Deprecated", zh: "已弃用" });
  const title = `${doc.component} ${
    isHook ? t({ en: "options", zh: "选项" }) : t({ en: "props", zh: "props" })
  }`;

  return (
    <Showcase label={title} frame="plain">
      <PropAnchors css={styles.frame}>
        <FlowBlock surface css={cardSurface.base}>
          <Table
            caption={title}
            stickyColumn
            css={styles.table}
            containerCss={styles.region}
          >
            <TableHead>
              <TableRow>
                <TableHeaderCell
                  scope="col"
                  css={[typeRole.caption, styles.headCell]}
                >
                  {isHook
                    ? t({ en: "Option", zh: "选项" })
                    : t({ en: "Prop", zh: "Prop" })}
                </TableHeaderCell>
                <TableHeaderCell
                  scope="col"
                  css={[typeRole.caption, styles.headCell]}
                >
                  {t({ en: "Type", zh: "类型" })}
                </TableHeaderCell>
                <TableHeaderCell
                  scope="col"
                  css={[typeRole.caption, styles.headCell]}
                >
                  {t({ en: "Description", zh: "说明" })}
                </TableHeaderCell>
                <td css={[styles.headCell, styles.caretColumn]} />
              </TableRow>
            </TableHead>
            {doc.props.map((prop) => {
              const id = propRowId(component, prop.name);
              const description = describe(prop, locale);
              return (
                <PropRow
                  key={prop.name}
                  id={id}
                  name={
                    <>
                      <TableDisclosureTrigger css={styles.name}>
                        {prop.name}
                      </TableDisclosureTrigger>
                      {prop.required ? (
                        <Text
                          as="span"
                          look="caption"
                          tone="muted"
                          weight="medium"
                          css={styles.mark}
                        >
                          {requiredLabel}
                        </Text>
                      ) : null}
                      {prop.deprecated === undefined ? null : (
                        <Text
                          as="span"
                          look="caption"
                          tone="warning"
                          weight="medium"
                          css={styles.mark}
                        >
                          {deprecatedLabel}
                        </Text>
                      )}
                    </>
                  }
                  type={<PropType prop={prop} />}
                  summary={setInlineCode(firstSentence(description))}
                  fullType={
                    <p css={styles.fullType}>
                      <PropType prop={prop} wraps />
                    </p>
                  }
                >
                  <PropDescription
                    component={component}
                    doc={doc}
                    prop={prop}
                    description={description}
                  />
                </PropRow>
              );
            })}
          </Table>
        </FlowBlock>
      </PropAnchors>

      {doc.extendsHtml === undefined ? null : (
        // Two fragments around the element name: the name is the one part of
        // the sentence that is not translated.
        <FlowBlock css={[typeRole.bodySmall, styles.inherited]}>
          {t({ en: "Also accepts every ", zh: "同时接受 " })}
          <Text as="span" look="bodySmall">
            <code css={styles.code}>{`<${doc.extendsHtml}>`}</code>
          </Text>
          {t({ en: " attribute.", zh: " 元素的原生属性。" })}
        </FlowBlock>
      )}
    </Showcase>
  );
}

/**
 * The fragment of one row. A page can show the props of more than one
 * component, so the component's subpath leads it: `button-prop-size`.
 */
function propRowId(component: string, name: string) {
  return `${component}-prop-${name}`;
}

/**
 * The runs a type may wrap after: between the members of a union, and
 * between the arguments of a generic or the keys of an object.
 */
const BREAKS_AFTER = new Set(["|", ",", ";", "<"]);

const NO_BREAK_SPACE = " ";

const punctStyles = stylex.create({
  punct: {
    color: color.mutedForeground,
  },
});

const tokenStyles = {
  string: codeRun.string,
  number: codeRun.number,
  keyword: codeRun.keyword,
  type: codeRun.component,
  label: codeRun.property,
  name: codeRun.plain,
  punct: punctStyles.punct,
  space: null,
} satisfies Record<TypeTokenKind, unknown>;

/**
 * The type, coloured by the kind of each run as code is on the rest of the
 * site, with the punctuation quiet. A default that is one member of the union
 * is set bold in it, and says so to a screen reader; any other default follows
 * the type as a quiet `= value`. In the row it stays on one line; in the panel
 * it `wraps` after a `|` or another separator.
 */
function PropType({ prop, wraps = false }: { prop: PropDoc; wraps?: boolean }) {
  const { defaultValue } = prop;
  const tokens = typeTokens(prop.type);
  const defaultHint = t({ en: " (default)", zh: "（默认值）" });
  const defaultAt =
    defaultValue === undefined
      ? -1
      : tokens.findIndex(([, text]) => text === defaultValue);

  return (
    <Text as="span" look="bodySmall">
      <code css={[styles.code, wraps && styles.wrappingType]}>
        {tokens.map(([kind, text], index) => {
          const key = `${String(index)}${text}`;
          if (kind === "space") {
            const isBreak =
              wraps && BREAKS_AFTER.has(tokens[index - 1]?.[1] ?? "");
            return isBreak ? (
              <Fragment key={key}>
                <wbr />{" "}
              </Fragment>
            ) : (
              <Fragment key={key}>{wraps ? NO_BREAK_SPACE : " "}</Fragment>
            );
          }
          const run =
            wraps &&
            (kind === "type" || kind === "name" || kind === "label") ? (
              <Identifier>{text}</Identifier>
            ) : (
              text
            );
          return (
            <span
              key={key}
              css={[
                tokenStyles[kind],
                index === defaultAt && styles.defaultMember,
              ]}
            >
              {run}
              {index === defaultAt ? (
                <span css={a11y.srOnly}>{defaultHint}</span>
              ) : null}
            </span>
          );
        })}
        {defaultValue === undefined || defaultAt !== -1 ? null : (
          <Text as="span" look="bodySmall" tone="muted">
            {" "}
            <span css={a11y.srOnly}>{t({ en: "Default", zh: "默认值" })}</span>
            {"="}
            {NO_BREAK_SPACE}
            {wraps ? <Identifier>{defaultValue}</Identifier> : defaultValue}
          </Text>
        )}
      </code>
    </Text>
  );
}

/** The page's locale, falling back to English while a `@zh` tag is missing. */
function describe(prop: PropDoc, locale: SupportedLocale) {
  const translated = prop.description[locale];
  return translated === "" ? prop.description.en : translated;
}

interface PropDescriptionProps {
  component: string;
  doc: PropsDoc;
  prop: PropDoc;
  description: string;
}

/**
 * A JSDoc summary: paragraphs split on a blank line, backticks set as code.
 * Code that names another prop of the same component links to its row.
 */
function PropDescription({
  component,
  doc,
  prop,
  description,
}: PropDescriptionProps) {
  const names = new Set(
    doc.props.map(({ name }) => name).filter((name) => name !== prop.name),
  );
  const paragraphs = description
    .split("\n\n")
    .filter((paragraph) => paragraph !== "");
  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} css={styles.paragraph}>
          {setInlineCode(paragraph, (code) =>
            names.has(code) ? propRowId(component, code) : undefined,
          )}
        </p>
      ))}
    </>
  );
}

function setInlineCode(
  paragraph: string,
  linkFor: (code: string) => string | undefined = () => undefined,
): ReactNode {
  let at = 0;
  return paragraph.split("`").map((part, index) => {
    const key = at;
    at += part.length + 1;
    if (index % 2 === 0) return <Fragment key={key}>{part}</Fragment>;
    const target = linkFor(part);
    return target === undefined ? (
      <Text key={key} as="span" look="bodySmall">
        <code css={[styles.code, styles.inlineCode]}>{part}</code>
      </Text>
    ) : (
      <a key={key} href={`#${target}`} css={[a11y.focusRing, styles.codeLink]}>
        <Text as="span" look="bodySmall">
          <code css={[styles.code, styles.inlineCode]}>{part}</code>
        </Text>
      </a>
    );
  });
}

const styles = stylex.create({
  frame: {
    marginBlockStart: rhythm.tight,
  },
  // Inside the card's border, so its corner follows the card's.
  region: {
    borderRadius: `calc(${border.radius_3} - ${border.size_1})`,
    cornerShape: "squircle",
  },
  // Wide enough for each column to read on a phone, where it scrolls.
  table: {
    minInlineSize: "38rem",
  },
  headCell: {
    blockSize: controlHeight.md,
    paddingBlock: 0,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    fontWeight: font.weight_5,
  },
  // The caret's column takes only its own width, and the head's rule.
  caretColumn: {
    inlineSize: "1px",
    boxShadow: `inset 0 calc(-1 * ${border.size_1}) 0 ${color.border}`,
  },
  name: {
    color: color.foreground,
    whiteSpace: "nowrap",
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingNormal,
  },
  mark: {
    marginInlineStart: rhythm.tight,
  },
  code: {
    fontFamily: font.familyMono,
    letterSpacing: font.trackingNormal,
  },
  // A name breaks at its own seams, and a run with no seam at any point, so
  // the whole type shows in the panel.
  wrappingType: {
    overflowWrap: "anywhere",
  },
  fullType: {
    margin: 0,
    marginBlockEnd: rhythm.tight,
  },
  defaultMember: {
    fontWeight: font.weight_7,
  },
  // A code span is one word: `aria-label` must not break at its hyphen.
  inlineCode: {
    whiteSpace: "nowrap",
  },
  codeLink: {
    color: color.foreground,
    textDecorationLine: "underline",
    textDecorationColor: {
      default: color.border,
      ":hover": { default: null, [pointer.canHover]: color.mutedForeground },
      ":focus-visible": color.mutedForeground,
    },
    textDecorationThickness: border.size_1,
    textUnderlineOffset: space._0,
  },
  paragraph: {
    margin: 0,
    maxInlineSize: measure.prose,
    marginBlockEnd: {
      default: rhythm.tight,
      ":last-child": 0,
    },
  },
  // With the section's gap, this sets the note a group apart from the table.
  inherited: {
    margin: 0,
    color: color.mutedForeground,
    marginBlockStart: rhythm.item,
  },
});

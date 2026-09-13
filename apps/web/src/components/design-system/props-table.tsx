import * as stylex from "@stylexjs/stylex";
import type { PropDoc } from "@tuja/props-codegen/types";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { Fragment, type ReactNode } from "react";
import { PROPS_DOCS } from "#src/_generated/props/index.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import type { SupportedLocale } from "#src/types.ts";
import { Identifier } from "./identifier.tsx";
import { Showcase } from "./showcase.tsx";

interface PropsTableProps {
  /** The component's export subpath — `"button"`, `"card-header"`. */
  component: string;
}

/**
 * One component's props, read from the generated documents rather than written
 * by hand: the summary of each prop's own JSDoc, localised by the page's
 * locale. A table from `md` up, where the columns let a reader scan one prop
 * against the next; a labelled block per prop below that, which reads better on
 * a phone than a table scrolling sideways.
 */
export function PropsTable({ component }: PropsTableProps) {
  const doc = PROPS_DOCS[component];
  const locale = getLocale();
  const title = `${doc.component} ${t({ en: "props", zh: "属性" })}`;
  const propLabel = t({ en: "Prop", zh: "属性" });
  const typeLabel = t({ en: "Type", zh: "类型" });
  const defaultLabel = t({ en: "Default", zh: "默认值" });
  const descriptionLabel = t({ en: "Description", zh: "说明" });

  return (
    <Showcase label={title} frame="plain" breakout>
      <div css={styles.tableView}>
        <Table
          caption={title}
          css={styles.table}
          containerCss={styles.tableContainer}
        >
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col" css={styles.nameColumn}>
                {propLabel}
              </TableHeaderCell>
              <TableHeaderCell scope="col" css={styles.typeColumn}>
                {typeLabel}
              </TableHeaderCell>
              <TableHeaderCell scope="col" css={styles.defaultColumn}>
                {defaultLabel}
              </TableHeaderCell>
              <TableHeaderCell scope="col">{descriptionLabel}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {doc.props.map((prop) => (
              <TableRow key={prop.name}>
                <TableHeaderCell scope="row" css={styles.nameCell}>
                  <PropName prop={prop} />
                </TableHeaderCell>
                <TableCell>
                  <PropType prop={prop} />
                </TableCell>
                <TableCell>
                  {prop.defaultValue === undefined ? (
                    <span css={styles.noDefault} aria-hidden>
                      –
                    </span>
                  ) : (
                    <code css={styles.code}>{prop.defaultValue}</code>
                  )}
                </TableCell>
                <TableCell css={styles.descriptionCell}>
                  <Prose text={describe(prop, locale)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <dl css={styles.stackView}>
        {doc.props.map((prop) => (
          <div key={prop.name} css={styles.stackRow}>
            <dt css={styles.stackName}>
              <PropName prop={prop} />
            </dt>
            <dd css={styles.stackFields}>
              <div css={styles.stackField}>
                <span css={styles.stackLabel}>{typeLabel}</span>
                <PropType prop={prop} />
              </div>
              {prop.defaultValue === undefined ? null : (
                <div css={styles.stackField}>
                  <span css={styles.stackLabel}>{defaultLabel}</span>
                  <code css={styles.code}>{prop.defaultValue}</code>
                </div>
              )}
              <Prose text={describe(prop, locale)} />
            </dd>
          </div>
        ))}
      </dl>

      {doc.extendsHtml === undefined ? null : (
        // Two fragments around the element name: the name is the one part of
        // the sentence that is not translated.
        <p css={styles.inherited}>
          {t({ en: "Also accepts every ", zh: "同时接受 " })}
          <code css={styles.code}>{`<${doc.extendsHtml}>`}</code>
          {t({ en: " attribute.", zh: " 元素的原生属性。" })}
        </p>
      )}
    </Showcase>
  );
}

/** The page's locale, falling back to English while a `@zh` tag is missing. */
function describe(prop: PropDoc, locale: SupportedLocale) {
  const translated = prop.description[locale];
  return translated === "" ? prop.description.en : translated;
}

function PropName({ prop }: { prop: PropDoc }) {
  return (
    <span css={styles.nameLine}>
      <span css={styles.name}>
        <Identifier>{prop.name}</Identifier>
      </span>
      {prop.required ? (
        <Badge intent="accent" size="sm">
          {t({ en: "Required", zh: "必填" })}
        </Badge>
      ) : null}
      {prop.deprecated === undefined ? null : (
        <Badge intent="warning" size="sm">
          {t({ en: "Deprecated", zh: "已弃用" })}
        </Badge>
      )}
    </span>
  );
}

/** A union of string literals reads as a list; anything else as one expression. */
function PropType({ prop }: { prop: PropDoc }) {
  if (prop.kind === "enum" && prop.members !== undefined) {
    return (
      <span css={styles.typeList}>
        {prop.members.map((member) => (
          <code key={member} css={[corner.radius_1, styles.typeToken]}>
            {JSON.stringify(member)}
          </code>
        ))}
      </span>
    );
  }
  return <code css={styles.code}>{breakAtUnions(prop.type)}</code>;
}

/** A JSDoc summary: paragraphs split on a blank line, backticks set as code. */
function Prose({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter((paragraph) => paragraph !== "");
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p
          key={paragraph}
          css={[styles.paragraph, index > 0 && styles.nextParagraph]}
        >
          {setInlineCode(paragraph)}
        </p>
      ))}
    </>
  );
}

/** Wrap opportunities after each `|`, so a long type breaks between members. */
function breakAtUnions(type: string): ReactNode {
  let at = 0;
  return type.split("|").map((part, index) => {
    const key = at;
    at += part.length + 1;
    return (
      <Fragment key={key}>
        {index > 0 ? (
          <>
            |<wbr />
          </>
        ) : null}
        {part}
      </Fragment>
    );
  });
}

function setInlineCode(paragraph: string): ReactNode {
  let at = 0;
  return paragraph.split("`").map((part, index) => {
    const key = at;
    at += part.length + 1;
    return index % 2 === 1 ? (
      <code key={key} css={styles.code}>
        {part}
      </code>
    ) : (
      <Fragment key={key}>{part}</Fragment>
    );
  });
}

const styles = stylex.create({
  tableView: {
    display: { default: "none", [breakpoints.md]: "block" },
    minInlineSize: 0,
  },
  tableContainer: {
    // The scroll region is the table's own surface, so a table too wide for the
    // page scrolls inside it rather than setting the page adrift.
    maxInlineSize: "100%",
  },
  table: {
    tableLayout: "fixed",
  },
  nameColumn: {
    inlineSize: "18%",
  },
  typeColumn: {
    inlineSize: "20%",
  },
  defaultColumn: {
    inlineSize: "12%",
  },
  nameCell: {
    verticalAlign: "top",
  },
  descriptionCell: {
    color: color.textMuted,
  },
  nameLine: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._1,
    minInlineSize: 0,
  },
  name: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    overflowWrap: "break-word",
  },
  typeList: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._0,
    minInlineSize: 0,
  },
  typeToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMain,
    backgroundColor: color.bgInteractiveRest,
    paddingInline: space._1,
    paddingBlock: space._00,
    overflowWrap: "break-word",
  },
  noDefault: {
    color: color.textMuted,
  },
  paragraph: {
    margin: 0,
    textWrap: "pretty",
  },
  nextParagraph: {
    marginBlockStart: space._2,
  },
  stackView: {
    display: { default: "flex", [breakpoints.md]: "none" },
    flexDirection: "column",
    margin: 0,
  },
  // The same seam the table draws between two rows, so the stack still reads
  // as one list of props.
  stackRow: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._3,
    borderBlockStartWidth: { default: 0, ":not(:first-child)": border.size_1 },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
    minInlineSize: 0,
  },
  stackName: {
    fontSize: font.uiBody,
  },
  stackFields: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
  },
  stackField: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: space._1,
    minInlineSize: 0,
  },
  stackLabel: {
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  inherited: {
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
  },
});

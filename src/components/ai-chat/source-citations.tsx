"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { truncate } from "#src/primitives/layout.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";

export interface SourceCitation {
  sourceId: string;
  url: string;
  title?: string;
}

function formatDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface SourceCitationsProps {
  sources: ReadonlyArray<SourceCitation>;
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  if (sources.length === 0) return null;

  return (
    <div css={styles.container}>
      <p css={styles.heading}>
        {t({ en: "Sources", zh: "来源" })}
      </p>
      <ul css={styles.list}>
        {sources.map((source) => (
          <li key={source.sourceId}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              css={[flex.row, styles.link]}
            >
              <span css={[truncate.base, styles.linkText]}>
                {source.title ?? formatDomain(source.url)}
              </span>
              <span css={styles.domain}>
                {source.title ? formatDomain(source.url) : null}
              </span>
              <ArrowSquareOutIcon
                size={12}
                css={styles.icon}
                aria-hidden="true"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = stylex.create({
  container: {
    paddingTop: space._2,
  },
  heading: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMuted,
    paddingBottom: space._1,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._00,
  },
  link: {
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: color.controlActive,
    textDecoration: { default: "none", ":hover": "underline" },
    paddingBlock: space._00,
    borderRadius: border.radius_1,
  },
  linkText: {
    flexShrink: 1,
    minWidth: 0,
  },
  domain: {
    flexShrink: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  icon: {
    flexShrink: 0,
    opacity: 0.6,
  },
});

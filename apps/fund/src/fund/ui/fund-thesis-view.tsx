"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Card } from "@tuja/ui/components/card";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Columns } from "@tuja/ui/components/columns";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Section } from "@tuja/ui/components/section";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ThesisView } from "../views/load-thesis.ts";
import { displayDate } from "./display-date.ts";
import { formatPercent } from "./format-percent.ts";
import { MarkdownText } from "./markdown-text.tsx";

const styles = stylex.create({
  lead: {
    margin: 0,
    paddingInlineStart: space._3,
    borderInlineStartWidth: border.size_2,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.primary,
  },
  plan: {
    margin: 0,
    paddingInlineStart: space._4,
    listStyleType: "decimal",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
  },
});

function VersionRow({
  version,
}: {
  version: ThesisView["fundVersions"][number];
}) {
  const locale = useLocale();
  const name = t({ en: "Version {n}", zh: "第 {n} 版" }).replace(
    "{n}",
    String(version.version),
  );
  const detail =
    version.changeNote ?? t({ en: "The first version.", zh: "第一版。" });
  const value = displayDate(version.decidedOn, locale);
  return version.runId === null ? (
    <ListRow wrap detail={detail} value={value}>
      {name}
    </ListRow>
  ) : (
    <ListRow
      wrap
      href={getLocalePath(`/journal/${version.runId}`, locale)}
      detail={detail}
      value={value}
    >
      {name}
    </ListRow>
  );
}

function Part({ title, text }: { title: string; text: string }) {
  return (
    <Section level={3} look="heading" title={title}>
      <MarkdownText>{text}</MarkdownText>
    </Section>
  );
}

/** The fund thesis, summary first, with the portfolio it builds and its history. */
export function FundThesisView({
  fund,
  versions,
}: {
  fund: NonNullable<ThesisView["fund"]>;
  versions: ThesisView["fundVersions"];
}) {
  const { body } = fund;
  const construction = body.portfolioConstruction;
  return (
    <Columns ratio="2:1">
      <div css={stack.group}>
        <div css={[typeRole.fluidLead, styles.lead]}>
          <MarkdownText>{body.summary}</MarkdownText>
        </div>
        <Part
          title={t({ en: "Philosophy", zh: "投资理念" })}
          text={body.philosophy}
        />
        <Part
          title={t({ en: "Objective", zh: "目标" })}
          text={body.objective}
        />
        <Part
          title={t({ en: "The edge it claims", zh: "自认的优势" })}
          text={body.edge}
        />
        <Section
          level={3}
          look="heading"
          title={t({ en: "The plan", zh: "计划" })}
        >
          <ol css={styles.plan}>
            {body.plan.map((phase) => (
              <li key={phase.phase}>
                <div css={stack.tight}>
                  <Text as="p" look="body" weight="semibold" verbatim>
                    {phase.phase}
                  </Text>
                  <MarkdownText>{phase.description}</MarkdownText>
                </div>
              </li>
            ))}
          </ol>
        </Section>
        <Part
          title={t({ en: "Holding discipline", zh: "持有纪律" })}
          text={body.holdingDiscipline}
        />
        <Part
          title={t({ en: "Sell discipline", zh: "卖出纪律" })}
          text={body.sellDiscipline}
        />
      </div>
      <div css={stack.group}>
        <Card>
          <div css={stack.item}>
            <CardHeader>
              <CardTitle level={3}>
                {t({ en: "How the portfolio is built", zh: "组合如何构建" })}
              </CardTitle>
            </CardHeader>
            <StatGroup look="plain">
              <Stat
                label={t({ en: "Positions", zh: "持仓数" })}
                value={`${String(construction.minPositions)}–${String(construction.maxPositions)}`}
              />
              <Stat
                label={t({ en: "Typical weight", zh: "典型权重" })}
                value={formatPercent(construction.typicalWeightPct, {
                  digits: 0,
                })}
              />
            </StatGroup>
            <Text as="p" look="bodySmall" tone="muted" measure="none" verbatim>
              {body.horizon}
            </Text>
            <div css={typeModifier.verbatim}>
              <Text as="p" look="label">
                {t({ en: "Cash", zh: "现金" })}
              </Text>
              <MarkdownText>{construction.cashPolicy}</MarkdownText>
            </div>
          </div>
        </Card>
        <Section
          level={3}
          title={t({ en: "Versions", zh: "版本" })}
          description={t({
            en: "The portfolio manager reviews the thesis at each meeting. It stays unchanged unless new evidence calls for a revision, which says what changed and why.",
            zh: "基金经理每次开会都会检查投资逻辑。除非新的证据需要修订，否则保持不变；修订会写明改了什么、为什么。",
          })}
        >
          <List>
            {versions.map((version) => (
              <VersionRow key={version.version} version={version} />
            ))}
          </List>
        </Section>
      </div>
    </Columns>
  );
}

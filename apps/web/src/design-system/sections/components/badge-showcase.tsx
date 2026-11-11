import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { StatusDot } from "@tuja/ui/components/status-dot";
import { Text } from "@tuja/ui/components/text";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";

export function BadgeShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Intents", zh: "意图色" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Badge intent="default">{t({ en: "Default", zh: "默认" })}</Badge>
          </Specimen>
          <Specimen caption="neutral">
            <Badge intent="neutral">{t({ en: "Neutral", zh: "中性" })}</Badge>
          </Specimen>
          <Specimen caption="info">
            <Badge intent="info">{t({ en: "Info", zh: "信息" })}</Badge>
          </Specimen>
          <Specimen caption="success">
            <Badge intent="success">{t({ en: "Success", zh: "成功" })}</Badge>
          </Specimen>
          <Specimen caption="warning">
            <Badge intent="warning">{t({ en: "Warning", zh: "警告" })}</Badge>
          </Specimen>
          <Specimen caption="destructive">
            <Badge intent="destructive">
              {t({ en: "Destructive", zh: "破坏性" })}
            </Badge>
          </Specimen>
          <Specimen caption="primary">
            <Badge intent="primary">{t({ en: "Primary", zh: "主要" })}</Badge>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Badge size="sm" intent="primary">
              {t({ en: "Small", zh: "小" })}
            </Badge>
          </Specimen>
          <Specimen caption="md">
            <Badge size="md" intent="primary">
              {t({ en: "Medium", zh: "中" })}
            </Badge>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Badge
              size="sm"
              intent="success"
              icon={<CheckIcon weight="bold" />}
            >
              {t({ en: "Verified", zh: "已验证" })}
            </Badge>
          </Specimen>
          <Specimen caption="md">
            <Badge size="md" intent="warning" icon={<StarIcon weight="fill" />}>
              {t({ en: "Featured", zh: "精选" })}
            </Badge>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <PropsTable component="badge" />

      <Showcase
        label={t({
          en: "Mark what waits with a dot",
          zh: "用圆点标出待处理的事",
        })}
      >
        <SpecimenGrid>
          <Specimen caption="warning">
            <span css={[row.tight, typeRole.label]}>
              {t({ en: "Mailboxes", zh: "邮箱" })}
              <StatusDot
                intent="warning"
                label={t({
                  en: "(needs connecting again)",
                  zh: "（需要重新连接）",
                })}
              />
            </span>
          </Specimen>
          <Specimen caption="destructive">
            <span css={[row.tight, typeRole.label]}>
              {t({ en: "Sync", zh: "同步" })}
              <StatusDot
                intent="destructive"
                label={t({ en: "(failed)", zh: "（失败）" })}
              />
            </span>
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: "A dot says that something waits, without a word on screen. Its label is read by a screen reader only, so the place that shows the dot must still say it.",
            zh: "圆点表示有事等待处理，但不在屏幕上显示文字。它的 label 只供屏幕阅读器朗读，所以显示圆点的位置仍需说明含义。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <PropsTable component="status-dot" />

      <Showcase
        label={t({
          en: "Keep a status with its facts on one line",
          zh: "让状态与相关事实排成一行",
        })}
      >
        <Specimen caption="MetaLine">
          <Text as="div" look="caption" tone="muted" css={styles.narrow}>
            <MetaLine
              facts={[
                <Badge key="status" size="sm" intent="success">
                  {t({ en: "Connected", zh: "已连接" })}
                </Badge>,
                "Gmail",
                t({ en: "Last checked at 9:30", zh: "上次检查于 9:30" }),
              ]}
            />
          </Text>
        </Specimen>
        <ShowcaseHelper>
          {t({
            en: 'MetaLine puts a dot between each two facts and wraps between them first. A fact that starts a new line shows no dot. A fact too wide for a whole line wraps, or ends in "…" where its box does not wrap.',
            zh: "MetaLine 在每两项事实之间放一个圆点，并优先在事实之间换行。换到新行开头的事实不显示圆点。一项事实比整行还宽时会换行；若所在的框不换行，则以“…”结尾。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <PropsTable component="meta-line" />
    </>
  );
}

const styles = stylex.create({
  narrow: {
    inlineSize: "13rem",
    maxInlineSize: "100%",
  },
});

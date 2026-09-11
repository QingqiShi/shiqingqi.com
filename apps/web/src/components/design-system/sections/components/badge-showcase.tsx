import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { Badge } from "@tuja/ui/components/badge";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

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
          <Specimen caption="danger">
            <Badge intent="danger">{t({ en: "Danger", zh: "危险" })}</Badge>
          </Specimen>
          <Specimen caption="accent">
            <Badge intent="accent">{t({ en: "Accent", zh: "强调" })}</Badge>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Badge size="sm" intent="accent">
              {t({ en: "Small", zh: "小" })}
            </Badge>
          </Specimen>
          <Specimen caption="md">
            <Badge size="md" intent="accent">
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

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <>
              <Badge intent="success">
                {t({ en: "Active", zh: "进行中" })}
              </Badge>
              <Badge intent="neutral">{t({ en: "Draft", zh: "草稿" })}</Badge>
            </>
          }
          doCaption={t({
            en: "Use a badge for terse, at-a-glance status or metadata.",
            zh: "用徽章表示简洁、一目了然的状态或元信息。",
          })}
          dont={
            <>
              <Badge intent="accent">{t({ en: "All", zh: "全部" })}</Badge>
              <Badge intent="default">{t({ en: "Movies", zh: "电影" })}</Badge>
            </>
          }
          dontCaption={t({
            en: "Don't use badges as filters or toggles — reach for a Button or segmented control that's focusable and reports state.",
            zh: "不要把徽章当作筛选或开关——应使用可聚焦且能反馈状态的按钮或分段控件。",
          })}
        />
      </Showcase>
    </>
  );
}

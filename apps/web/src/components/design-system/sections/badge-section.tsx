import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { Badge } from "@tuja/ui/components/badge";
import { t } from "#src/i18n.ts";
import { Section } from "../section.tsx";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../showcase.tsx";

export function BadgeSection() {
  return (
    <Section
      id="badge"
      title={t({ en: "Badge", zh: "徽章" })}
      description={t({
        en: "Compact status and label indicators. Six tones for different signals — neutral, accent, and four semantic — at two sizes.",
        zh: "紧凑的状态和标签指示器。提供六种色调以传达不同信号——中性、强调与四种语义色——并支持两种尺寸。",
      })}
    >
      <Showcase label={t({ en: "Variants", zh: "风格" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="default">
            <Badge variant="default">{t({ en: "Default", zh: "默认" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="info">
            <Badge variant="info">{t({ en: "Info", zh: "信息" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="success">
            <Badge variant="success">{t({ en: "Success", zh: "成功" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="warning">
            <Badge variant="warning">{t({ en: "Warning", zh: "警告" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="danger">
            <Badge variant="danger">{t({ en: "Danger", zh: "危险" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="accent">
            <Badge variant="accent">{t({ en: "Accent", zh: "强调" })}</Badge>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="small">
            <Badge size="small" variant="accent">
              {t({ en: "Small", zh: "小" })}
            </Badge>
          </ShowcaseItem>
          <ShowcaseItem label="medium">
            <Badge size="medium" variant="accent">
              {t({ en: "Medium", zh: "中" })}
            </Badge>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="small">
            <Badge
              size="small"
              variant="success"
              icon={<CheckIcon weight="bold" />}
            >
              {t({ en: "Verified", zh: "已验证" })}
            </Badge>
          </ShowcaseItem>
          <ShowcaseItem label="medium">
            <Badge
              size="medium"
              variant="warning"
              icon={<StarIcon weight="fill" />}
            >
              {t({ en: "Featured", zh: "精选" })}
            </Badge>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>
    </Section>
  );
}

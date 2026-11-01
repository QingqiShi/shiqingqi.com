import { t } from "@tuja/i18n";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { ViewportScaleSpecimen } from "./viewport-scale-specimen.tsx";

/** The fluid type roles, which grow with the viewport or with a container. */
export function TypographyFluidShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Let a title grow with its space.",
        zh: "让标题随空间变大。",
      })}
      lead={t({
        en: "The fluid roles, such as fluidDisplay below, step up at sm, md and lg, for a landing page. No component uses them, so compose them from typeRole.",
        zh: "流式角色（如下方的 fluidDisplay）在 sm、md 与 lg 处逐级变大，用于落地页。没有组件使用它们，因此需要从 typeRole 中组合。",
      })}
    >
      <ViewportScaleSpecimen />
      <GuideNote>
        {t({
          en: 'cardTitle grows with a card that has containerType: "inline-size".',
          zh: 'cardTitle 随设有 containerType: "inline-size" 的卡片变大。',
        })}
      </GuideNote>
    </GuideSection>
  );
}

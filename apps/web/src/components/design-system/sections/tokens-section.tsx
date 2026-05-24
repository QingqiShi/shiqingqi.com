import { t } from "#src/i18n.ts";
import { Section } from "../section.tsx";
import { FamiliesShowcase } from "./tokens/families-showcase.tsx";
import { GradientsShowcase } from "./tokens/gradients-showcase.tsx";
import { LetterSpacingShowcase } from "./tokens/letter-spacing-showcase.tsx";
import { LineHeightsShowcase } from "./tokens/line-heights-showcase.tsx";
import { ResponsiveSizesShowcase } from "./tokens/responsive-sizes-showcase.tsx";
import { RolesShowcase } from "./tokens/roles-showcase.tsx";
import { ShadowsShowcase } from "./tokens/shadows-showcase.tsx";
import { SurfacesShowcase } from "./tokens/surfaces-showcase.tsx";
import { TypeScaleShowcase } from "./tokens/type-scale-showcase.tsx";
import { WeightsShowcase } from "./tokens/weights-showcase.tsx";

export function TokensSection() {
  return (
    <Section
      id="tokens"
      title={t({ en: "Tokens", zh: "设计令牌" })}
      description={t({
        en: "The atomic building blocks — colors, typography, spacing, shadows, and gradients that everything else composes from.",
        zh: "原子级构筑模块——颜色、排版、间距、阴影与渐变，构成上层一切设计。",
      })}
    >
      <SurfacesShowcase />
      <RolesShowcase />
      <ShadowsShowcase />
      <GradientsShowcase />
      <FamiliesShowcase />
      <WeightsShowcase />
      <TypeScaleShowcase />
      <ResponsiveSizesShowcase />
      <LineHeightsShowcase />
      <LetterSpacingShowcase />
    </Section>
  );
}

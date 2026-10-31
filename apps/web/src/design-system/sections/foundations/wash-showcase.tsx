import { t } from "@tuja/i18n";
import { Card } from "@tuja/ui/components/card";
import { wash } from "@tuja/ui/primitives/wash.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

export function WashShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Shade a still surface with a Wash.",
        zh: "用淡彩为静止的表面加一层明暗。",
      })}
      lead={t({
        en: "A Wash lays one quiet tone across a surface and fades it out toward the edge you name: bottom, top, right or left.",
        zh: "淡彩在表面上铺一层安静的色调，并朝你指定的那条边渐渐淡去：下、上、右或左。",
      })}
    >
      <Specimen token="wash.toBottom">
        <Card css={wash.toBottom}>
          {t({ en: "Three days in Kyoto", zh: "京都三日" })}
        </Card>
      </Specimen>
      <GuideNote>
        {t({
          en: "Set the tone with washTokens.tone, and keep it quiet: a bright tone looks like a light.",
          zh: "用 washTokens.tone 设定色调，并保持克制：明亮的色调看起来像一盏灯。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

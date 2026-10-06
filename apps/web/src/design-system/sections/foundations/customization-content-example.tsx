import { CloudCheckIcon } from "@phosphor-icons/react/dist/ssr/CloudCheck";
import { Callout } from "@tuja/ui/components/callout";
import { GuideNote } from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { t } from "#src/i18n.ts";

export function CustomizationContentExample() {
  return (
    <>
      <Specimen
        caption={t({
          en: "The same Callout with its own icon",
          zh: "同一个 Callout，换上自己的图标",
        })}
      >
        <Callout
          intent="success"
          icon={<CloudCheckIcon />}
          title={t({ en: "Saved for offline", zh: "已离线保存" })}
        >
          {t({
            en: "Kyoto opens without a connection.",
            zh: "京都行程无需联网即可打开。",
          })}
        </Callout>
      </Specimen>
      <GuideNote>
        {t({
          en: "The default icon says success; this one says where the trip went. Callout still tints it, hides it from screen readers and lines it up with the title. icon={null} removes it.",
          zh: "默认图标表示成功；这个图标则说明行程去了哪里。Callout 依然为它着色、对屏幕阅读器隐藏它，并让它与标题对齐。icon={null} 会移除图标。",
        })}
      </GuideNote>
    </>
  );
}

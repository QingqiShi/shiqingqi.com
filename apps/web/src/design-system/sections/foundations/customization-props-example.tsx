import { Callout } from "@tuja/ui/components/callout";
import { GuideNote } from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { t } from "#src/i18n.ts";

export function CustomizationPropsExample() {
  return (
    <>
      <Specimen
        caption={t({
          en: "Callout with intent and title",
          zh: "设置了 intent 与 title 的 Callout",
        })}
      >
        <Callout
          intent="success"
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
          en: "intent chooses the tint, the border, the icon and the live role: alert for warning and danger, status for the rest. You pass the words and write no style.",
          zh: "intent 决定了浅色背景、边框、图标与 live 角色：warning 与 danger 为 alert，其余为 status。你只传入文字，不写任何样式。",
        })}
      </GuideNote>
    </>
  );
}

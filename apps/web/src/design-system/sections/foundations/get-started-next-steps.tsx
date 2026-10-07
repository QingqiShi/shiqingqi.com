import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { RouteLinkCards } from "#src/design-system/guide/route-link-cards.tsx";
import { t } from "#src/i18n.ts";

export function GetStartedNextSteps() {
  return (
    <GuideSection
      title={t({ en: "Where next", zh: "下一步" })}
      lead={t({
        en: "The set-up is done. The other Foundation pages say which Token or Primitive does each job.",
        zh: "设置已经完成。其余的基础页面会说明每项工作该用哪个令牌或原语。",
      })}
    >
      <RouteLinkCards
        columns={3}
        links={[
          {
            path: "/design-system/foundations/customization",
            body: t({
              en: "Every way to change a component, from a prop to your own markup, and what each one leaves to you.",
              zh: "改变组件的每一种方式，从一个属性到你自己的标记结构，以及每种方式留给你负责的部分。",
            }),
          },
          {
            path: "/design-system/foundations/color",
            body: t({
              en: "Which colour Token does which job, and where an Intent belongs.",
              zh: "哪个颜色令牌承担哪项工作，以及意图色该用在哪里。",
            }),
          },
          {
            path: "/design-system",
            title: t({ en: "Components", zh: "组件" }),
            body: t({
              en: "Every component, with a Lab to try its props and copy the code.",
              zh: "所有组件，每个都有实验室，可以试用属性并复制代码。",
            }),
          },
        ]}
      />
    </GuideSection>
  );
}

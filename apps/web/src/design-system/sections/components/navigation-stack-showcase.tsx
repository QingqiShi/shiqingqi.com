import { t } from "@tuja/i18n";
import { Suspense } from "react";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { FrameBreakout } from "./device-frame.tsx";
import {
  NavigationStackDemo,
  NavigationStackDemoPlaceholder,
} from "./navigation-stack-specimens.tsx";
import { ShellChoice } from "./shell-choice.tsx";

export function NavigationStackShowcase() {
  return (
    <>
      <ShellChoice />

      <GuideSection
        title={t({
          en: "Give each screen its content and the way back.",
          zh: "给每个画面它的内容和返回的路。",
        })}
        lead={t({
          en: "A screen with nothing beside it is a Navigation stack: the content sits in the page column with even gaps, and the way back is at its top. A screen whose back link leads to the screen before it slides in over that screen.",
          zh: "旁边没有别的东西的画面用导航栈：内容排在页面栏里，间距均匀，返回的路在顶部。返回链接指向上一个画面时，新画面从它上方滑入。",
        })}
      >
        <FrameBreakout>
          <Suspense fallback={<NavigationStackDemoPlaceholder />}>
            <NavigationStackDemo />
          </Suspense>
        </FrameBreakout>
        <GuideNote>
          {t({
            en: "Leave back out on the first screen of a destination.",
            zh: "目标页的第一个画面不传 back。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "toolbar puts controls on the line of the way back, and accessory floats an action at the bottom end.",
            zh: "toolbar 把控件放在返回链接那一行，accessory 让一个操作浮在底部末端。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "flush lets a scene fill the screen from edge to edge; each part then sets its own page column.",
            zh: "flush 让场景从边到边铺满画面，此时每一部分自行设定页面栏。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="navigation-stack" />
    </>
  );
}

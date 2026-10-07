import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Spinner } from "@tuja/ui/components/spinner";
import { TextField } from "@tuja/ui/components/text-field";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  controlSize,
  font,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { Anchor } from "#src/links/anchor.tsx";
import { CopyBudgetSpecimen } from "./copy-budget-specimen.tsx";
import { KeyboardModelSpecimen } from "./keyboard-model-specimen.tsx";

export function AccessibilityShowcase() {
  const locale = getLocale();

  const guaranteed = [
    t({
      en: "A focus ring on every interactive component, shown on :focus-visible",
      zh: "每个可交互组件都有焦点环，在 :focus-visible 时显示",
    }),
    t({
      en: "Arrow keys, Home and End in SegmentedControl, single-choice OptionCardGroup and MenuButton menus",
      zh: "SegmentedControl、单选 OptionCardGroup 与 MenuButton 菜单支持方向键、Home 与 End",
    }),
    t({
      en: "Overlay and the SidebarLayout drawer move focus in, trap Tab, close on Escape and give focus back",
      zh: "Overlay 与 SidebarLayout 的抽屉会移入焦点、捕获 Tab、按 Escape 关闭并交还焦点",
    }),
    t({
      en: "Label, description and error wired to the control on every field",
      zh: "每个字段的标签、描述与错误都已关联到控件",
    }),
    t({
      en: "Errors, Callouts, Spinners and busy Buttons announced",
      zh: "错误、Callout、Spinner 与繁忙状态的 Button 会被播报",
    }),
    t({
      en: "A type error when a required name is missing",
      zh: "缺少必需的名称时报类型错误",
    }),
    t({
      en: "Native inputs under Checkbox, Select, Slider and Switch",
      zh: "Checkbox、Select、Slider 与 Switch 底层使用原生输入元素",
    }),
  ];

  const yours = [
    t({
      en: "Every string a component shows or announces, in each language you ship",
      zh: "组件显示或播报的每一段文字，并覆盖你支持的每种语言",
    }),
    t({
      en: "A name for each Switch, which the types do not check",
      zh: "为每个 Switch 命名，类型检查不会提醒你",
    }),
    t({
      en: 'role="menuitem" on each item you put in a MenuButton menu',
      zh: '为放进 MenuButton 菜单的每一项加上 role="menuitem"',
    }),
    t({
      en: "Heading levels in document order",
      zh: "标题层级符合文档顺序",
    }),
    t({
      en: "Colour pairings that clear contrast, and a reduced-motion branch for your own motion",
      zh: "达到对比度要求的颜色搭配，以及为你自己的动效写上减弱动效分支",
    }),
  ];

  const names = [
    {
      term: "TextField · Textarea · Select · Checkbox · Slider",
      value: "label",
      note: t({
        en: "Always required. labelHidden hides it from view and keeps it as the name.",
        zh: "始终必填。labelHidden 在视觉上隐藏它，但仍保留为名称。",
      }),
    },
    {
      term: "Button · AnchorButton",
      value: t({
        en: "children, or aria-label / aria-labelledby",
        zh: "children，或 aria-label / aria-labelledby",
      }),
      note: t({
        en: "With no visible label, one of the two ARIA props is required.",
        zh: "没有可见标签时，必须提供这两个 ARIA 属性之一。",
      }),
    },
    {
      term: "SegmentedControl · OptionCardGroup",
      value: "aria-label / aria-labelledby",
      note: t({
        en: "Names the group. Each option's label names only that option.",
        zh: "为整组命名。每个选项的 label 只命名该选项。",
      }),
    },
    {
      term: "Overlay",
      value: "aria-label / aria-labelledby · closeLabel",
      note: t({
        en: "Names the dialog and its close button.",
        zh: "为对话框及其关闭按钮命名。",
      }),
    },
    {
      term: "SidebarLayout",
      value: "menuLabel · closeLabel",
      note: t({
        en: "Names the mobile menu button, the open drawer and its close button.",
        zh: "为移动端菜单按钮、打开的抽屉及其关闭按钮命名。",
      }),
    },
    {
      term: "Callout",
      value: "dismissLabel",
      note: t({
        en: "Required when onDismiss is set, and not allowed otherwise.",
        zh: "设置 onDismiss 时必填，否则不可传入。",
      }),
    },
    {
      term: "Spinner",
      value: t({ en: "label, or aria-hidden", zh: "label，或 aria-hidden" }),
      note: t({
        en: "Pass aria-hidden only inside something that already announces the busy state.",
        zh: "只有在已自行播报繁忙状态的元素内部，才传入 aria-hidden。",
      }),
    },
    {
      term: "Progress",
      value: "label",
      note: t({
        en: "Names the progress bar.",
        zh: "为进度条命名。",
      }),
    },
    {
      term: "Table",
      value: "caption",
      note: t({
        en: "Names the table and its scroll region. Screen-reader only unless captionVisible is set.",
        zh: "为表格及其滚动区域命名。除非设置 captionVisible，否则只供读屏软件使用。",
      }),
    },
    {
      term: "Breadcrumb",
      value: "label",
      note: t({
        en: "Names the navigation landmark.",
        zh: "为导航地标命名。",
      }),
    },
    {
      term: "Avatar",
      value: "name · badgeLabel",
      note: t({
        en: "name is the person. When you set badge, badgeLabel says what it means and is added to the name.",
        zh: "name 只写这个人。设置 badge 时，badgeLabel 说明它的含义，并追加到名称之后。",
      }),
    },
    {
      term: "ScrollMask",
      value: "scrollButtons.startLabel · endLabel",
      note: t({
        en: "Names the two scroll buttons, when you ask for them.",
        zh: "在你启用滚动按钮时，为这两个按钮命名。",
      }),
    },
    {
      term: "Switch",
      value: t({
        en: "aria-label, or a <label>",
        zh: "aria-label，或一个 <label>",
      }),
      note: t({
        en: "Needed like the others, but the types do not enforce it.",
        zh: "和其他组件一样必需，但类型不会强制要求。",
      }),
    },
  ];

  const announced = [
    {
      term: t({ en: "A field's error", zh: "字段的 error" }),
      value: 'role="alert"',
      note: t({
        en: "Announced as soon as it appears, interrupting what is being read. Write it so it makes sense heard on its own.",
        zh: "一出现就会被播报，并打断正在朗读的内容。请让它单独听到时也能理解。",
      }),
    },
    {
      term: "Callout",
      value: 'role="alert" · role="status"',
      note: t({
        en: "The whole box is a live region: alert for danger and warning, status for the other intents, which waits for a pause. Override it with role.",
        zh: "整个提示框就是实时区域：danger 与 warning 为 alert，其他意图色为 status，会等到停顿时再播报。可用 role 覆盖。",
      }),
    },
    {
      term: "Spinner label",
      value: 'role="status"',
      note: t({
        en: "Announced politely.",
        zh: "以礼貌方式播报。",
      }),
    },
    {
      term: t({ en: "A loading Button", zh: "加载中的 Button" }),
      value: "aria-busy",
      note: t({
        en: "Keeps its width and its focus, and announces that it is busy. With an icon, the spinner takes the icon's place and the label stays. Without one, the spinner covers the label, which also leaves the accessibility tree. It blocks the click with aria-disabled, because the native disabled attribute would drop focus.",
        zh: "保留宽度与焦点，并播报繁忙状态。带图标时，加载指示器取代图标，标签保留；不带图标时，加载指示器遮住标签，标签也会离开无障碍树。它用 aria-disabled 阻止点击，因为原生 disabled 属性会让按钮失去焦点。",
      }),
    },
    {
      term: "Chip trailing · Disclosure trailing",
      value: t({ en: "Part of the name", zh: "名称的一部分" }),
      note: t({
        en: "Read after the label, so a count or status there must read well as part of it.",
        zh: "紧接在标签之后朗读，因此放在这里的计数或状态要能与标签连读。",
      }),
    },
    {
      term: t({ en: "Every icon slot", zh: "所有图标插槽" }),
      value: "aria-hidden",
      note: t({
        en: "Never read. The words around the icon carry its meaning.",
        zh: "永远不会被朗读。含义由图标旁的文字承载。",
      }),
    },
  ];

  const length = [
    {
      term: "Button · AnchorButton",
      value: t({ en: "Wraps", zh: "换行" }),
      note: t({
        en: "The control has a minimum height, not a fixed one, so it grows taller.",
        zh: "控件只有最小高度，没有固定高度，因此会变高。",
      }),
    },
    {
      term: "Chip · Badge",
      value: t({ en: "Never wraps or shrinks", zh: "从不换行或收缩" }),
      note: t({
        en: "A long label makes it wider and pushes the row, or overflows a narrow parent.",
        zh: "过长的标签会把它撑宽、挤压所在的行，或溢出较窄的父元素。",
      }),
    },
    {
      term: "SegmentedControl",
      value: t({ en: "Truncates", zh: "截断" }),
      note: t({
        en: "A label that does not fit ends in an ellipsis. The full text stays the option's name.",
        zh: "放不下的标签以省略号结尾。完整文字仍作为该选项的名称。",
      }),
    },
    {
      term: "Breadcrumb",
      value: t({ en: "Wraps", zh: "换行" }),
      note: t({
        en: "The trail continues on the next line.",
        zh: "路径会接到下一行。",
      }),
    },
    {
      term: "TableCell numeric",
      value: t({ en: "Never wraps", zh: "从不换行" }),
      note: t({
        en: "A narrow table scrolls instead.",
        zh: "较窄的表格改为滚动。",
      }),
    },
    {
      term: "Text · Heading",
      value: t({ en: "Wraps", zh: "换行" }),
      note: t({
        en: 'Text wraps pretty and a Heading balances its lines. wrap="nowrap" keeps a run on one line.',
        zh: 'Text 以 pretty 方式换行，Heading 让各行长度均衡。wrap="nowrap" 让一段文字保持单行。',
      }),
    },
  ];

  const hooks = [
    {
      term: "useRadioGroup",
      value: "@tuja/ui/hooks/use-radio-group",
      note: t({
        en: 'A single choice among buttons: roving tab stop, arrows move and select, Home and End, wraps at the ends. You add role="radiogroup" and a name on the wrapper.',
        zh: '在一组按钮中单选：漫游式 Tab 停靠点，方向键移动并选中，支持 Home 与 End，到头后循环。你需要在外层加上 role="radiogroup" 与名称。',
      }),
    },
    {
      term: "useDisclosure",
      value: "@tuja/ui/hooks/use-disclosure",
      note: t({
        en: "Show and hide: aria-expanded and aria-controls on the trigger, hidden on the panel. Keep the panel mounted so aria-controls always points at something.",
        zh: "显示与隐藏：在触发器上设置 aria-expanded 与 aria-controls，在面板上设置 hidden。请让面板始终挂载，使 aria-controls 始终有指向。",
      }),
    },
    {
      term: "usePopover",
      value: "@tuja/ui/hooks/use-popover",
      note: t({
        en: "An anchored popup: moves focus in on open, and back to the trigger on close if the popup still has it. Closes on Escape, an outside press or focus leaving. It does not trap focus.",
        zh: "锚定弹出层：打开时移入焦点；关闭时若焦点仍在弹出层内，则交还给触发元素。按 Escape、点击外部或焦点离开时关闭。它不会捕获焦点。",
      }),
    },
    {
      term: "useDialogFocus",
      value: "@tuja/ui/hooks/use-dialog-focus",
      note: t({
        en: 'A modal: moves focus in, traps Tab, calls onClose on Escape, and gives focus back to the trigger. You render role="dialog" and its name.',
        zh: '模态层：移入焦点、捕获 Tab、按 Escape 时调用 onClose，并把焦点交还给触发元素。role="dialog" 及其名称由你渲染。',
      }),
    },
  ];

  const structure = [
    {
      term: "SidebarLayout · HeaderFooterLayout",
      value: "<main>",
      note: t({
        en: 'The content region is the main landmark. Pass as="div" when the layout sits inside something that already has one.',
        zh: '内容区就是 main 地标。当布局位于已有该地标的结构内时，传入 as="div"。',
      }),
    },
    {
      term: "Heading",
      value: "level · look",
      note: t({
        en: "level sets the rank in the outline and look sets the size, so you can keep the outline in order and still choose the size.",
        zh: "level 决定大纲中的层级，look 决定字号，因此你可以保持大纲有序，同时自由选择字号。",
      }),
    },
    {
      term: "Divider",
      value: 'look="decorative"',
      note: t({
        en: "The subtle and bold looks are separators that assistive technology reports. The decorative look is an ornament and leaves the accessibility tree.",
        zh: "subtle 与 bold 外观是会被辅助技术报告的分隔符。decorative 外观只是装饰，会退出无障碍树。",
      }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({
          en: "What the components handle",
          zh: "组件负责的部分",
        })}
        lead={t({
          en: "Use a component and the first list comes with it. The second list stays with you, whichever component you use.",
          zh: "使用组件，就会得到第一份清单中的一切。第二份清单无论用哪个组件都由你负责。",
        })}
      >
        <div css={styles.splitGrid}>
          <Checklist
            title={t({
              en: "What the components guarantee",
              zh: "组件保障的内容",
            })}
            items={guaranteed}
            marker="check"
          />
          <Checklist
            title={t({ en: "What is left to you", zh: "留给你的内容" })}
            items={yours}
            marker="arrow"
          />
        </div>
        <GuideNote>
          <Anchor
            href={getLocalePath("/design-system/foundations/color", locale)}
          >
            {t({
              en: "Which colour pairings clear contrast",
              zh: "哪些颜色搭配达到对比度要求",
            })}
          </Anchor>
          {" · "}
          <Anchor
            href={getLocalePath("/design-system/foundations/motion", locale)}
          >
            {t({
              en: "Reduced motion in your own styles",
              zh: "在你自己的样式中处理减弱动效",
            })}
          </Anchor>
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "You supply every name",
          zh: "每个名称都由你提供",
        })}
        lead={t({
          en: "@tuja/ui contains no copy and no translations. Every word a component shows or announces comes from a prop you pass, already in the reader's language. Where a component needs a name, leaving it out is a type error.",
          zh: "@tuja/ui 不包含任何文案，也不做翻译。组件显示或播报的每个词都来自你传入的属性，并且要已是读者的语言。组件需要名称时，不提供就会报类型错误。",
        })}
      >
        <div css={cluster.item}>
          <Button
            icon={<TrashIcon weight="bold" />}
            aria-label={t({ en: "Delete", zh: "删除" })}
          />
          <Button look="outline" icon={<TrashIcon weight="bold" />}>
            {t({ en: "Delete", zh: "删除" })}
          </Button>
        </div>
        <UsageSnippet
          code={`// Icon only: aria-label is required.
<Button icon={<TrashIcon weight="bold" />} aria-label={t("Delete")} />

// A visible label names it.
<Button icon={<TrashIcon weight="bold" />}>{t("Delete")}</Button>`}
        />
        <GuideList items={names} />
      </GuideSection>

      <GuideSection
        title={t({ en: "Fields", zh: "表单字段" })}
        lead={t({
          en: "TextField, Textarea, Checkbox, Select and Slider wire the label to the control, and the description and error to aria-describedby. An error also sets aria-invalid, so a field cannot show an error and stay valid.",
          zh: "TextField、Textarea、Checkbox、Select 与 Slider 会把标签关联到控件，并把描述与错误关联到 aria-describedby。错误还会设置 aria-invalid，因此字段不可能显示错误却仍处于有效状态。",
        })}
      >
        <div css={[styles.grid, styles.gridAlignStart]}>
          <TextField
            label={t({ en: "Display name", zh: "显示名称" })}
            description={t({
              en: "Shown next to anything you post.",
              zh: "会显示在你发布的所有内容旁。",
            })}
            defaultValue="Qingqi"
          />
          <TextField
            label={t({ en: "Email", zh: "电子邮箱" })}
            error={t({
              en: "Enter an address that includes an @.",
              zh: "输入包含 @ 的地址。",
            })}
            defaultValue="qingqi.dev"
          />
        </div>
        <UsageSnippet
          code={`<TextField
  label={t("Email")}
  description={t("We only use it to sign you in.")}
  error={emailError}
/>`}
        />
        <DoDont
          do={
            <TextField
              label={t({ en: "Search", zh: "搜索" })}
              labelHidden
              placeholder={t({ en: "Search films", zh: "搜索电影" })}
            />
          }
          doCaption={t({
            en: "labelHidden keeps the name for screen readers, and the placeholder only adds a hint.",
            zh: "labelHidden 为读屏软件保留名称，占位文字只作补充提示。",
          })}
          dont={
            // A drawing of the mistake, not the mistake itself: a real unnamed
            // `<input>` here would be the WCAG failure the caption warns about.
            <span
              css={[typeRole.bodySmall, corner.radius_2, styles.fauxInput]}
              aria-hidden
            >
              {t({ en: "Search films", zh: "搜索电影" })}
            </span>
          }
          dontCaption={t({
            en: "A placeholder is not a name, and it goes away as soon as someone types.",
            zh: "占位文字不是名称，而且用户一开始输入它就消失了。",
          })}
        />
      </GuideSection>

      <GuideSection
        title={t({
          en: "How your words are read",
          zh: "你的文字如何被朗读",
        })}
        lead={t({
          en: "Some strings are announced the moment they appear, some are read as part of a control's name, and icons are never read. Write each one for the way it reaches the reader.",
          zh: "有些文字一出现就会被播报，有些会作为控件名称的一部分被朗读，而图标永远不会被朗读。请按每段文字到达读者的方式来写。",
        })}
      >
        <div css={[stack.item, styles.shrink]}>
          <Callout intent="success">
            {t({
              en: "Saved. Your list now has 12 films.",
              zh: "已保存。你的片单现在有 12 部电影。",
            })}
          </Callout>
          <div css={cluster.item}>
            <Spinner label={t({ en: "Loading results", zh: "正在加载结果" })} />
            <Button look="primary" loading>
              {t({ en: "Save", zh: "保存" })}
            </Button>
          </div>
        </div>
        <GuideList items={announced} />
      </GuideSection>

      <GuideSection
        title={t({
          en: "When a string runs long",
          zh: "文字过长时",
        })}
        lead={t({
          en: "Components treat length differently: some wrap, some truncate, and some never break. A translation is often longer than the original, so check each string in every language you ship. Type a long label below.",
          zh: "各组件处理长度的方式不同：有的换行，有的截断，有的从不断开。译文常常比原文长，因此请在你支持的每种语言中检查每段文字。在下面输入一个较长的标签试试。",
        })}
      >
        <CopyBudgetSpecimen />
        <GuideList items={length} />
      </GuideSection>

      <GuideSection
        title={t({
          en: "Focus and names on your own control",
          zh: "自建控件的焦点与名称",
        })}
        lead={t({
          en: "A control you build from primitives starts with the focus ring and nothing else; the other guarantees above are yours to add. The ring is the one the components use: a 2px accent outline at a 2px offset, on :focus-visible only. buttonReset.base already carries it, and a11y.focusRing gives it to any other element that takes focus, such as a link. a11y.srOnly hides a name from view and keeps it in the accessibility tree. Tab into the row below.",
          zh: "用原语自建的控件，一开始只带有焦点环；上述其他保障需要你自己补上。这个焦点环与组件所用的相同：2px 强调色描边、2px 外偏移，只在 :focus-visible 时出现。buttonReset.base 已经带有它，a11y.focusRing 则把它加到其他可获得焦点的元素上，例如链接。a11y.srOnly 在视觉上隐藏名称，但将其保留在无障碍树中。按 Tab 进入下面这一行。",
        })}
      >
        <div css={cluster.item}>
          <Button look="outline">{t({ en: "A Button", zh: "Button" })}</Button>
          <button
            type="button"
            css={[
              buttonReset.base,
              flex.inlineCenter,
              corner.radius_round,
              styles.bareControl,
            ]}
          >
            <TrashIcon weight="bold" aria-hidden />
            <span css={a11y.srOnly}>{t({ en: "Delete", zh: "删除" })}</span>
          </button>
          <span css={[corner.radius_round, styles.clipFrame]}>
            <button
              type="button"
              css={[
                typeRole.label,
                buttonReset.base,
                a11y.focusRingInset,
                corner.radius_round,
                styles.insetChip,
              ]}
            >
              {t({ en: "Inset ring", zh: "内嵌焦点环" })}
            </button>
          </span>
        </div>
        <UsageSnippet
          code={`import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";

<button css={[buttonReset.base, styles.control]}>
  <TrashIcon weight="bold" aria-hidden />
  <span css={a11y.srOnly}>{t("Delete")}</span>
</button>`}
        />
        <GuideNote>
          {t({
            en: "Where an ancestor clips overflow, the outer ring is cut off. a11y.focusRingInset draws the same ring inside the box; Disclosure, SegmentedControl and an interactive Card use it.",
            zh: "祖先元素裁切溢出内容时，外侧的焦点环会被截掉。a11y.focusRingInset 把同一个环画在盒内；Disclosure、SegmentedControl 与可交互的 Card 都使用它。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Keyboard and focus on your own control",
          zh: "自建控件的键盘与焦点",
        })}
        lead={t({
          en: "The hooks behind the components are exported, so a custom control can have the same keyboard model. Focus the control below and press the arrow keys: SegmentedControl is built on useRadioGroup.",
          zh: "组件背后的钩子都已导出，因此自建控件也能有相同的键盘模型。聚焦下面的控件并按方向键：SegmentedControl 就是基于 useRadioGroup 构建的。",
        })}
      >
        <div css={cluster.item}>
          <KeyboardModelSpecimen />
        </div>
        <GuideList items={hooks} />
        <GuideNote>
          <Anchor href={getLocalePath("/design-system/hooks", locale)}>
            {t({
              en: "Each hook's options and return value",
              zh: "每个钩子的参数与返回值",
            })}
          </Anchor>
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Page structure", zh: "页面结构" })}
        lead={t({
          en: "The layouts give you the main landmark, and the content components keep rank and look apart.",
          zh: "布局组件为你提供 main 地标，内容组件则把层级与外观分开。",
        })}
      >
        <GuideList items={structure} />
      </GuideSection>
    </>
  );
}

interface ChecklistProps {
  title: string;
  items: string[];
  marker: "check" | "arrow";
}

/** One half of the split that opens the page: what ships, and what is yours. */
function Checklist({ title, items, marker }: ChecklistProps) {
  const check = marker === "check";
  return (
    <div css={[stack.tight, corner.radius_2, styles.checklist]}>
      <h3 css={[typeRole.overline, styles.checklistTitle]}>{title}</h3>
      <ul css={[stack.item, styles.checklistItems]}>
        {items.map((item) => (
          <li key={item} css={[typeRole.body, styles.checklistItem]}>
            <span
              css={[styles.marker, check ? styles.doneMark : styles.todoMark]}
            >
              {check ? (
                <CheckIcon weight="bold" aria-hidden />
              ) : (
                <ArrowRightIcon weight="bold" aria-hidden />
              )}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = stylex.create({
  shrink: {
    minInlineSize: 0,
  },
  splitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 19rem), 1fr))",
    gap: rhythm.item,
    alignItems: "start",
  },
  checklist: {
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    minInlineSize: 0,
  },
  checklistTitle: {
    margin: 0,
    color: color.fgMuted,
  },
  checklistItems: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  checklistItem: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    gap: rhythm.tight,
    color: color.fg,
    minInlineSize: 0,
  },
  // Nudged down so the glyph sits on the first line, not at the top of its box.
  marker: {
    display: "inline-flex",
    position: "relative",
    insetBlockStart: "0.3em",
    fontSize: controlSize._3,
    lineHeight: font.lineHeight_0,
  },
  doneMark: {
    color: color.fgSuccess,
  },
  todoMark: {
    color: color.fgAccent,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
    gap: rhythm.item,
  },
  // Labels above and errors below, so rows must not stretch to the tallest cell.
  gridAlignStart: {
    alignItems: "start",
  },
  bareControl: {
    inlineSize: space._8,
    blockSize: space._8,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    fontSize: controlSize._4,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
  },
  // Clips its child, which is the case `focusRingInset` exists for.
  clipFrame: {
    display: "inline-flex",
    overflow: "hidden",
  },
  insetChip: {
    paddingBlock: space._1,
    paddingInline: space._3,
    color: color.fg,
    backgroundColor: {
      default: color.bgControlSelected,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
  },
  // A field's chrome without a field inside it. `fgMuted` is correct here
  // because the text carries `aria-hidden`.
  fauxInput: {
    display: "inline-block",
    paddingBlock: space._1,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    fontFamily: font.family,
    color: color.fgMuted,
    backgroundColor: color.bgSurface,
    minInlineSize: 0,
  },
});

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { IconButton } from "@tuja/ui/components/icon-button";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { GuideList } from "../../guide/guide-list.tsx";
import { GuideNote, GuideSection } from "../../guide/guide-section.tsx";
import { Identifier } from "../../identifier.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import { KeyboardModelSpecimen } from "./keyboard-model-specimen.tsx";
import { ReducedMotionSpecimen } from "./reduced-motion-specimen.tsx";
import { TEXT_ROLE_CONTRAST } from "./text-role-contrast.ts";

export function AccessibilityShowcase() {
  // Built in the component body so every `t()` stays in render scope.
  const roleSpecimenText = t({
    en: "The quick brown fox",
    zh: "敏捷的棕色狐狸",
  });

  const guaranteed = [
    t({
      en: "One focus ring, on everything interactive",
      zh: "所有可交互元素共用同一个焦点环",
    }),
    t({
      en: "Keyboard models for grouped controls and menus",
      zh: "成组控件与菜单自带键盘模型",
    }),
    t({
      en: "Focus trapped and handed back on modal surfaces",
      zh: "模态层内捕获焦点，退出时交还",
    }),
    t({
      en: "A reduced-motion branch inside every motion preset",
      zh: "每个动效预设内部都带减弱动效分支",
    }),
    t({
      en: "Live regions on the components that hold state",
      zh: "持有状态的组件自带实时播报区域",
    }),
    t({
      en: "Label, description and error wiring on every field",
      zh: "每个字段的标签、描述与错误都已关联妥当",
    }),
  ];

  const yours = [
    t({
      en: "Name every control that has no visible text",
      zh: "为每个没有可见文字的控件命名",
    }),
    t({
      en: "Pick a text role that clears the contrast floor for the job",
      zh: "为不同用途选择能达到对比度标准的文本角色",
    }),
    t({
      en: "Never let a placeholder stand in for a label",
      zh: "绝不用占位文字充当标签",
    }),
    t({
      en: "Keep heading levels in document order",
      zh: "保持标题层级符合文档顺序",
    }),
  ];

  const structure = [
    {
      term: "Heading",
      value: t({
        en: "Semantic level and visual size are separate props.",
        zh: "语义层级与视觉字号是两个独立属性。",
      }),
      note: t({
        en: "A section that needs an h2 for the document outline can still be sized like an h3, so the outline never has to break to get the type right.",
        zh: "文档大纲上需要 h2 的区块，视觉上仍可按 h3 呈现，因此绝不必为了排版而破坏大纲。",
      }),
    },
    {
      term: "Divider",
      value: t({
        en: 'role="separator" when it divides content, role="presentation" when decorative.',
        zh: '分隔内容时为 role="separator"，纯装饰时为 role="presentation"。',
      }),
      note: t({
        en: "A rule drawn for rhythm alone is noise in the accessibility tree.",
        zh: "仅为节奏而画的线，在无障碍树里只是噪音。",
      }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({ en: "Where the work sits", zh: "工作分工在哪里" })}
        lead={t({
          en: "Two lists. Neither is long, and the second one is the one to memorise.",
          zh: "两份清单。都不长，而需要记住的是第二份。",
        })}
      >
        <div css={styles.splitGrid}>
          <Checklist
            title={t({
              en: "Guaranteed by the components",
              zh: "由组件保障",
            })}
            items={guaranteed}
            marker="check"
          />
          <Checklist
            title={t({ en: "Left to you", zh: "留给你" })}
            items={yours}
            marker="arrow"
          />
        </div>
      </GuideSection>

      <GuideSection
        title={t({ en: "Names", zh: "名称" })}
        lead={t({
          en: "A control with no visible text takes its name from its type. Omitting one is a build error, not a review comment.",
          zh: "没有可见文字的控件，其名称由类型强制要求。遗漏会导致构建报错，而不是留待评审时才发现。",
        })}
      >
        <div css={[flex.wrap, styles.row]}>
          <IconButton
            variant="surface"
            icon={<TrashIcon weight="bold" />}
            aria-label={t({ en: "Delete", zh: "删除" })}
          />
          <Button variant="outline">{t({ en: "Delete", zh: "删除" })}</Button>
          <button
            type="button"
            css={[
              buttonReset.base,
              flex.inlineCenter,
              a11y.focusRing,
              corner.radius_round,
              styles.bareControl,
            ]}
          >
            <TrashIcon weight="bold" aria-hidden />
            <span css={a11y.srOnly}>{t({ en: "Delete", zh: "删除" })}</span>
          </button>
        </div>
        <UsageSnippet
          code={`// The union is the enforcement: one of the two, never neither.
type Named =
  | { "aria-label": string; "aria-labelledby"?: undefined }
  | { "aria-labelledby": string; "aria-label"?: undefined };

// Building your own control? srOnly names it.
<button css={a11y.focusRing}>
  <TrashIcon aria-hidden />
  <span css={a11y.srOnly}>Delete</span>
</button>`}
        />
        <GuideNote>
          {t({
            en: "All three announce the same word. The third is the escape hatch: when you build a control from primitives rather than a component, a11y.srOnly carries the name so the icon can stay decorative.",
            zh: "三者播报的是同一个词。第三种是逃生通道：当你用原语而非组件来构建控件时，由 a11y.srOnly 承载名称，图标便可保持装饰性。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Focus", zh: "焦点" })}
        lead={t({
          en: "One indicator, from a11y.focusRing — a 2px accent outline at 2px offset, transparent until :focus-visible. Tab into the row below.",
          zh: "焦点指示只有一种，出自 a11y.focusRing——2px 强调色描边、2px 外偏移，在 :focus-visible 之前完全透明。按 Tab 进入下面这一行。",
        })}
      >
        <div css={[flex.wrap, styles.row]}>
          <Button variant="primary">{t({ en: "First", zh: "第一个" })}</Button>
          <Button variant="outline">{t({ en: "Second", zh: "第二个" })}</Button>
          <span css={[corner.radius_round, styles.clipFrame]}>
            <button
              type="button"
              css={[
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
        <GuideNote>
          {t({
            en: "focusRingInset pulls the same ring inside the box where an ancestor clips overflow. On modal surfaces useDialogFocus goes further: it saves the trigger, moves focus in, traps Tab, closes on Escape, and hands focus back on the way out.",
            zh: "祖先元素裁切溢出内容时，focusRingInset 把同一个环收进盒内。模态层上，useDialogFocus 还要更进一步：记住触发元素、把焦点移入、捕获 Tab、按 Escape 关闭，并在退出时把焦点交还。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Keyboard", zh: "键盘" })}
        lead={t({
          en: "Grouped controls ship a keyboard model, not just click handlers. Focus the control below and press the arrow keys.",
          zh: "成组控件附带的是一套键盘模型，而不只是点击回调。聚焦下面的控件并按方向键。",
        })}
      >
        <div css={[flex.wrap, styles.row]}>
          <KeyboardModelSpecimen />
        </div>
        <GuideNote>
          {t({
            en: "useRadioGroup gives it the WAI-ARIA radiogroup behaviour: arrows move and select, Home and End jump to the ends, activation wraps, and focus follows selection so each option announces as it is reached. MenuButton carries the popup model to match.",
            zh: "useRadioGroup 为其提供 WAI-ARIA radiogroup 行为：方向键移动并选中，Home 与 End 跳至首尾，选择可循环，且焦点随选择移动，因此每到一项即被播报。MenuButton 相应地承载弹出菜单模型。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Contrast", zh: "对比度" })}
        lead={t({
          en: "Three text roles, each measured against the worst background it lands on — the only pairing that binds.",
          zh: "三种文本角色，各自对照其所落到的最差背景来测量——那是唯一起约束作用的组合。",
        })}
      >
        {/* Three cards go one-up or three-up and never two-up, which needs a
            container to measure against. */}
        <div css={styles.roleGridFrame}>
          <div css={styles.roleGrid}>
            {TEXT_ROLE_CONTRAST.map((role) => (
              <div
                key={role.token}
                css={[flex.col, corner.radius_2, styles.roleCard]}
              >
                <span css={styles.token}>
                  <Identifier>{role.token}</Identifier>
                </span>
                {/* `Text` already owns the three role colours. */}
                <Text as="span" tone={role.tone} css={styles.roleSpecimen}>
                  {roleSpecimenText}
                </Text>
                <span css={styles.roleRatios}>
                  <span css={[flex.col, styles.roleRatioRow]}>
                    <span css={styles.roleRatio}>{role.light}</span>
                    <span css={styles.roleMeta}>
                      light · on <Identifier>bgCanvas</Identifier>
                    </span>
                  </span>
                  <span css={[flex.col, styles.roleRatioRow]}>
                    <span css={styles.roleRatio}>{role.dark}</span>
                    <span css={styles.roleMeta}>
                      dark · on <Identifier>bgSurfaceRaised</Identifier>
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Informational, not a warning: nothing here falls short any more. */}
        <Callout
          title={t({ en: "Where the floor sits", zh: "标准的下限在哪里" })}
        >
          {/* Quotes no figure: `t()` takes string literals, so a number here
              could not follow the palette the way the cards above do. */}
          {t({
            en: "WCAG AA asks 4.5:1 of body text and 3:1 of large text and UI. All three roles clear the body floor in both themes, so choosing between them is a question of rank rather than compliance. textSubtle is the quietest step that is still fully readable, which is what makes it right for supporting labels and wrong as the only place a fact appears.",
            zh: "WCAG AA 对正文要求 4.5:1，对大号文字与界面元素要求 3:1。三种角色在两种主题下都达到正文标准，因此在它们之间取舍关乎层级，而非合规。textSubtle 是仍然完全可读的最轻一档——这既是它适合承载辅助性标签的原因，也是它不能成为某项信息唯一出现之处的原因。",
          })}
        </Callout>
      </GuideSection>

      <GuideSection
        title={t({ en: "Reduced motion", zh: "减弱动效" })}
        lead={t({
          en: "prefers-reduced-motion is handled in the presets, not at the callsite — so reaching for a preset is the whole of a consumer's job. Below is your own setting, read live.",
          zh: "prefers-reduced-motion 在预设内部处理，而非在调用处——因此使用预设，就是调用方要做的全部。下面是实时读取的、你自己的设置。",
        })}
      >
        <ReducedMotionSpecimen />
        <UsageSnippet
          code={`stylex.create({
  // transition.transform — movement drops out entirely.
  transform: { default: "transform 200ms ease", [REDUCED_MOTION]: "none" },

  // animate.pulse — the loop stops rather than slowing down.
  animationName: { default: pulseKeyframes, [REDUCED_MOTION]: "none" },

  // transition.colors has no branch: a crossfade is already safe.
});`}
        />
        <GuideNote>
          {t({
            en: "The rule the presets encode: colour and opacity carry through untouched, geometry and looping do not. A slide, a scale, or anything infinite is what someone asking for less movement is asking about.",
            zh: "预设所遵循的规则是：颜色与透明度原样保留，几何变化与循环动画则不然。滑动、缩放，以及任何无限循环，才是提出该偏好的人真正想避免的。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Announcements", zh: "状态播报" })}
        lead={t({
          en: "State a sighted reader can see has to reach everyone else too, so the components that hold state own their live region rather than leaving it to the page.",
          zh: "视力正常的读者能看到的状态，也必须传达给其他所有人，因此持有状态的组件自行承担实时播报区域，而不把它留给页面。",
        })}
      >
        <div css={[flex.col, styles.stack]}>
          <Callout variant="success">
            {t({
              en: 'Callout is the live region itself — role="status" by default, and role="alert" for the danger and warning variants, which interrupt.',
              zh: 'Callout 本身就是实时区域——默认为 role="status"，而 danger 与 warning 变体使用会打断播报的 role="alert"。',
            })}
          </Callout>
          <div css={[flex.wrap, styles.row]}>
            <Spinner label={t({ en: "Loading results", zh: "正在加载结果" })} />
            <Text variant="bodySmall" tone="muted" css={styles.rowText}>
              {t({
                en: 'Spinner is role="status" with a required label. Pass aria-hidden to opt out, inside something that already announces itself.',
                zh: 'Spinner 为 role="status" 并必须提供 label。若置于已自行播报的元素内部，可传入 aria-hidden 退出。',
              })}
            </Text>
          </div>
          <div css={[flex.wrap, styles.row]}>
            <Button variant="primary" loading>
              {t({ en: "Save", zh: "保存" })}
            </Button>
            <Text variant="bodySmall" tone="muted" css={styles.rowText}>
              {t({
                en: "A busy Button announces aria-busy and blocks the click with aria-disabled. The native attribute would drop focus, so nobody hears that anything changed.",
                zh: "繁忙状态的 Button 会播报 aria-busy，并用 aria-disabled 拦截点击。原生属性会让按钮失去焦点，于是没人会听到状态已改变。",
              })}
            </Text>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title={t({ en: "Fields", zh: "表单字段" })}
        lead={t({
          en: "One hook, useFieldAria, wires label, description and error for TextField, Textarea, Checkbox and Select alike — so the contract is identical across the four instead of drifting per copy-paste.",
          zh: "同一个 useFieldAria 钩子，为 TextField、Textarea、Checkbox 与 Select 统一关联标签、描述与错误——因此四者的契约完全一致，不会因复制粘贴而各自漂移。",
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
        <div css={[flex.col, styles.stack]}>
          <Checkbox
            label={t({
              en: "Email me about releases",
              zh: "有新版本时邮件通知我",
            })}
            description={t({
              en: "Roughly once a month.",
              zh: "大约每月一次。",
            })}
            defaultChecked
          />
        </div>
        <GuideNote>
          {t({
            en: 'An error renders in role="alert", joins aria-describedby after the description rather than replacing it, and forces aria-invalid — a caller cannot set an error and leave the field valid.',
            zh: '错误信息以 role="alert" 渲染，追加到 aria-describedby 中已有描述之后而非替换它，并强制 aria-invalid——调用方无法既设置错误、又让字段保持有效。',
          })}
        </GuideNote>
        <DoDont
          do={
            <TextField
              label={t({ en: "Search", zh: "搜索" })}
              labelHidden
              placeholder={t({ en: "Search movies", zh: "搜索电影" })}
            />
          }
          doCaption={t({
            en: "labelHidden keeps the name in the accessibility tree, which frees the placeholder to say something else.",
            zh: "labelHidden 在无障碍树中保留名称，从而让占位文字可以另说其他内容。",
          })}
          dont={
            // A drawing of the mistake, not the mistake itself: a real unnamed
            // `<input>` here would be the very WCAG failure the caption warns about.
            <span css={[corner.radius_2, styles.fauxInput]} aria-hidden>
              {t({ en: "Search movies", zh: "搜索电影" })}
            </span>
          }
          dontCaption={t({
            en: "A placeholder is unnamed to a screen reader, and it disappears the moment someone starts typing.",
            zh: "占位文字对屏幕阅读器而言没有名称，而且用户一开始输入它就消失了。",
          })}
        />
      </GuideSection>

      <GuideSection
        title={t({ en: "Structure", zh: "页面结构" })}
        lead={t({
          en: 'Landmarks come from the shell: both SidebarLayout and HeaderFooterLayout render the content region as <main>, with as="div" as the escape hatch for a page nested inside something that already owns the landmark.',
          zh: '地标区域由页面骨架提供：SidebarLayout 与 HeaderFooterLayout 都把内容区渲染为 <main>，并以 as="div" 作为逃生通道，供嵌套在已拥有该地标的结构内的页面使用。',
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

/** One half of the split that opens the page: what ships, versus what is yours. */
function Checklist({ title, items, marker }: ChecklistProps) {
  const check = marker === "check";
  return (
    <div css={[flex.col, corner.radius_2, styles.checklist]}>
      <h3 css={styles.checklistTitle}>{title}</h3>
      <ul css={styles.checklistItems}>
        {items.map((item) => (
          <li key={item} css={styles.checklistItem}>
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

// Composed over `flex.*` at the callsites.
const styles = stylex.create({
  row: {
    gap: space._3,
  },
  stack: {
    gap: space._3,
    minInlineSize: 0,
  },
  splitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 19rem), 1fr))",
    gap: space._3,
    alignItems: "start",
  },
  checklist: {
    gap: space._2,
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  checklistTitle: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
    color: color.textSubtle,
  },
  checklistItems: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  checklistItem: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    gap: space._2,
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
    color: color.textMain,
    minInlineSize: 0,
  },
  // Nudged down so the glyph sits on the first line, not at the top of its box.
  marker: {
    display: "inline-flex",
    marginBlockStart: "0.3em",
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_0,
  },
  doneMark: {
    color: color.successText,
  },
  todoMark: {
    color: color.accentText,
  },
  // `<p>` is a block, so without a basis it would push the specimen onto its own
  // line. Sits alongside while there is room for a readable measure.
  rowText: {
    flexGrow: 1,
    flexBasis: "22rem",
    minInlineSize: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
    gap: space._3,
  },
  roleGridFrame: {
    containerType: "inline-size",
  },
  roleGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 40rem)": "repeat(3, minmax(0, 1fr))",
    },
    gap: space._3,
  },
  // Labels above and errors below, so rows must not stretch to the tallest cell.
  gridAlignStart: {
    alignItems: "start",
  },
  // Built from primitives, to show what the escape hatch costs: the ring and the
  // name are what you take on.
  bareControl: {
    inlineSize: space._8,
    blockSize: space._8,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    fontSize: font.uiHeading3,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgInteractiveHover,
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
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMain,
    backgroundColor: {
      default: color.bgInteractiveSelected,
      ":hover": color.bgInteractiveHover,
    },
  },
  roleCard: {
    gap: space._1,
    paddingBlock: space._3,
    paddingInline: space._3,
    // The light theme's binding background, so the specimen sits on the pairing
    // the quoted figures were measured against.
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    overflowWrap: "anywhere",
  },
  // Colour comes from `Text`'s `tone`; composed last, so this line-height wins.
  roleSpecimen: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_3,
    marginBlockStart: space._0,
  },
  // A grid rather than a stack, so a wide card puts the two themes side by side
  // and their figures still line up.
  roleRatios: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
    gap: space._1,
    marginBlockStart: space._1,
    minInlineSize: 0,
  },
  roleRatioRow: {
    gap: space._00,
    minInlineSize: 0,
  },
  roleRatio: {
    fontFamily: font.familyMono,
    fontSize: font.uiHeading3,
    fontWeight: font.weight_6,
    color: color.textMain,
    lineHeight: font.lineHeight_1,
  },
  // `break-word` rather than `anywhere`: the token name wraps to its own line
  // before it is ever broken through the middle.
  roleMeta: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    overflowWrap: "break-word",
  },
  // A field's chrome without a field inside it. `textSubtle` is the tell, and is
  // legitimate here because the text is `aria-hidden`.
  fauxInput: {
    display: "inline-block",
    paddingBlock: space._1,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    fontSize: font.uiBodySmall,
    fontFamily: font.family,
    color: color.textSubtle,
    backgroundColor: color.bgSurface,
    minInlineSize: 0,
  },
});

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Chip } from "@tuja/ui/components/chip";
import { Heading } from "@tuja/ui/components/heading";
import { TextField } from "@tuja/ui/components/text-field";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { GuideList } from "../../guide/guide-list.tsx";
import { GuideNote, GuideSection } from "../../guide/guide-section.tsx";
import { GuidelinePairs } from "../../guide/guideline-pairs.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import { CopyBudgetSpecimen } from "./copy-budget-specimen.tsx";

export function VoiceShowcase() {
  // Built in the component body so every `t()` stays in render scope. Each
  // quality states its rule and then shows it, so the name appears once.
  const qualityPairs = [
    {
      label: (
        <>
          <span css={styles.qualityName}>{t({ en: "Plain", zh: "平实" })}</span>{" "}
          {t({
            en: "The shortest wording that is still true.",
            zh: "用仍然成立的最短表述。",
          })}
        </>
      ),
      recommended: t({
        en: "This runs on every build.",
        zh: "每次构建都会执行。",
      }),
      notRecommended: t({
        en: "This is automatically executed as part of the standard build pipeline.",
        zh: "此项会作为标准构建流程的一部分被自动执行。",
      }),
    },
    {
      label: (
        <>
          <span css={styles.qualityName}>
            {t({ en: "Specific", zh: "具体" })}
          </span>{" "}
          {t({
            en: "Name the thing, the number, or the consequence.",
            zh: "写出具体的对象、数字或后果。",
          })}
        </>
      ),
      recommended: t({ en: "Removed 3 filters.", zh: "已移除 3 个筛选条件。" }),
      notRecommended: t({
        en: "Your changes have been applied.",
        zh: "您的更改已应用。",
      }),
    },
    {
      label: (
        <>
          <span css={styles.qualityName}>{t({ en: "Calm", zh: "克制" })}</span>{" "}
          {t({
            en: "Nothing shouts. No exclamation marks, no apologies.",
            zh: "任何时候都不喧哗。不用感叹号，不道歉。",
          })}
        </>
      ),
      recommended: t({
        en: "The link expired 3 days ago.",
        zh: "该链接已于 3 天前过期。",
      }),
      notRecommended: t({
        en: "Warning! This link is no longer valid!",
        zh: "警告！此链接已失效！",
      }),
    },
    {
      label: (
        <>
          <span css={styles.qualityName}>
            {t({ en: "Honest", zh: "诚实" })}
          </span>{" "}
          {t({
            en: "Say what it does, and what it doesn't.",
            zh: "说明它做什么，也说明它不做什么。",
          })}
        </>
      ),
      recommended: t({
        en: "Syncs every 15 minutes, not instantly.",
        zh: "每 15 分钟同步一次，并非实时。",
      }),
      notRecommended: t({
        en: "Always perfectly in sync.",
        zh: "始终完美同步。",
      }),
    },
  ];

  const budgets = [
    {
      term: "Badge",
      value: t({ en: "1–2 words", zh: "1–2 个词" }),
      note: t({
        en: "A state, not a sentence. It sets nowrap, so a third word pushes the layout instead of wrapping.",
        zh: "一种状态，不是一句话。它设置了 nowrap，因此第三个词只会撑开布局，而不会换行。",
      }),
    },
    {
      term: "Chip",
      value: t({ en: "1–3 words", zh: "1–3 个词" }),
      note: t({
        en: "Sits in a wrapping row beside its siblings, so uneven lengths read as a ragged edge.",
        zh: "与同类并排、可换行排布，因此长度不齐会读成参差的边缘。",
      }),
    },
    {
      term: "Button",
      value: t({ en: "1–3 words, verb first", zh: "1–3 个词，动词开头" }),
      note: t({
        en: "Sizes to its content, so a long label moves everything beside it. A label that needs a clause belongs in the text above the button.",
        zh: "由内容决定宽度，标签一长就会挤动旁边的一切。需要一整个从句的标签，那句话应放在按钮上方的正文里。",
      }),
    },
    {
      term: "Callout title",
      value: t({ en: "One line, no full stop", zh: "一行，不加句号" }),
      note: t({
        en: "A heading, not the first sentence. Anything that wants a full stop wants to be in the body.",
        zh: "它是标题，不是正文第一句。凡是想加句号的内容，都该放进正文。",
      }),
    },
    {
      term: "Callout body",
      value: t({ en: "1–2 sentences", zh: "1–2 句" }),
      note: t({
        en: "A callout interrupts. One sentence earns the interruption; by the third the reader wonders why this was not body text.",
        zh: "提示框会打断阅读。一句话足以换来这次打断；写到第三句，读者就该问它为什么不是正文了。",
      }),
    },
    {
      term: "Heading",
      value: t({ en: "One line at md", zh: "在 md 断点下不超过一行" }),
      note: t({
        en: "Headings are scanned, not read. The display steps carry three lines without complaint, which is the trap.",
        zh: "标题是被扫读的，不是被阅读的。展示级字阶能毫无怨言地排下三行——这正是陷阱所在。",
      }),
    },
  ];

  const states = [
    {
      term: t({ en: "Nothing here yet", zh: "还什么都没有" }),
      value: t({
        en: "Say what would be here, then give the control that puts it there.",
        zh: "说明这里本该有什么，再给出能让它出现的控件。",
      }),
      note: t({
        en: "“No lists yet — the lists you create show up here.”",
        zh: "“还没有清单——你创建的清单会出现在这里。”",
      }),
    },
    {
      term: t({ en: "Nothing matched", zh: "没有匹配结果" }),
      value: t({
        en: "Quote what was searched for, so the reader spots their own typo, then offer the way back.",
        zh: "把搜索内容原样引出来，让读者自己看见拼错的地方，再给出退路。",
      }),
      note: t({
        en: "“No results for godfahter — try a shorter search, or clear the filters.”",
        zh: "“没有找到‘教副’的结果——试试更短的关键词，或清除筛选条件。”",
      }),
    },
    {
      term: t({ en: "Loading", zh: "加载中" }),
      value: t({
        en: "Name what is loading. A spinner's label gets read out, so it has to be a phrase rather than a word.",
        zh: "写出正在加载什么。加载指示器的标签会被朗读出来，因此必须是短语而非单个词。",
      }),
      note: t({
        en: "“Loading results”, not “Loading” and not “Please wait”.",
        zh: "“正在加载搜索结果”，而不是“加载中”，更不是“请稍候”。",
      }),
    },
  ];

  // The words are struck rather than merely listed. Decoration only — the two
  // cells below each label say which is which on their own.
  const bannedWords = [
    {
      label: (
        <span css={styles.struck}>
          {t({ en: "simply · just · easy", zh: "只需 · 轻松 · 简单" })}
        </span>
      ),
      recommended: t({
        en: "Pick a folder to continue.",
        zh: "选择一个文件夹以继续。",
      }),
      notRecommended: t({
        en: "Simply pick a folder to continue.",
        zh: "只需选择一个文件夹即可继续。",
      }),
    },
    {
      label: (
        <span css={styles.struck}>
          {t({ en: "oops · sorry", zh: "哎呀 · 抱歉" })}
        </span>
      ),
      recommended: t({
        en: "That file is 14 MB. The limit is 10 MB.",
        zh: "该文件为 14 MB，上限是 10 MB。",
      }),
      notRecommended: t({
        en: "Oops! Sorry, something went wrong.",
        zh: "哎呀！很抱歉，出错了。",
      }),
    },
    {
      label: <span css={styles.struck}>{t({ en: "please", zh: "请" })}</span>,
      recommended: t({ en: "Enter a name.", zh: "输入名称。" }),
      notRecommended: t({ en: "Please enter a name.", zh: "请输入名称。" }),
    },
    {
      label: (
        <span css={styles.struck}>
          {t({ en: "click here · here", zh: "点击这里 · 这里" })}
        </span>
      ),
      recommended: t({
        en: "Read the contrast guidance.",
        zh: "阅读对比度指南。",
      }),
      notRecommended: t({
        en: "Click here for the contrast guidance.",
        zh: "点击这里查看对比度指南。",
      }),
    },
    {
      label: (
        <span css={styles.struck}>
          {t({
            en: "invalid · illegal · forbidden",
            zh: "无效 · 非法 · 禁止",
          })}
        </span>
      ),
      recommended: t({
        en: "Enter a date after today.",
        zh: "输入今天之后的日期。",
      }),
      notRecommended: t({ en: "Invalid date.", zh: "日期无效。" }),
    },
    {
      label: (
        <span css={styles.struck}>
          {t({
            en: "powerful · seamless · effortless",
            zh: "强大 · 无缝 · 毫不费力",
          })}
        </span>
      ),
      recommended: t({
        en: "Search covers titles and cast, not plot.",
        zh: "搜索涵盖片名与演职人员，不含剧情。",
      }),
      notRecommended: t({
        en: "Powerful search that finds anything, instantly.",
        zh: "强大的搜索，瞬间找到一切。",
      }),
    },
  ];

  const dialectPairs = [
    {
      label: <span css={styles.qualityName}>colour</span>,
      recommended: t({ en: "Colour is layered.", zh: "颜色是分层的。" }),
      notRecommended: t({ en: "Color is layered.", zh: "色彩是分层的。" }),
    },
    {
      label: <span css={styles.qualityName}>centred</span>,
      recommended: t({
        en: "The content stays centred beside the rail.",
        zh: "内容在侧栏旁保持居中。",
      }),
      notRecommended: t({
        en: "The content stays centered beside the rail.",
        zh: "内容在侧栏旁保持置中。",
      }),
    },
    {
      label: <span css={styles.qualityName}>localised</span>,
      recommended: t({
        en: "The consumer supplies the localised string.",
        zh: "由调用方提供本地化文案。",
      }),
      notRecommended: t({
        en: "The consumer supplies the localized string.",
        zh: "由调用方提供在地化文案。",
      }),
    },
  ];

  const descriptionPair = [
    {
      recommended: t({
        en: "Email — We'll only use this to sign you in.",
        zh: "电子邮箱 —— 仅用于登录。",
      }),
      notRecommended: t({
        en: "Email — Enter your email address.",
        zh: "电子邮箱 —— 请输入您的电子邮箱地址。",
      }),
    },
  ];

  const errorPair = [
    {
      recommended: t({
        en: "The session expired while you were away. Sign in again to pick up where you left off.",
        zh: "你离开期间登录已过期。重新登录即可从中断处继续。",
      }),
      notRecommended: t({ en: "Something went wrong.", zh: "出错了。" }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({ en: "Four qualities", zh: "四条品质" })}
        lead={t({
          en: "Hold any sentence against these and you can answer yes or no. Every rule further down is one of the four made specific to a component.",
          zh: "把任意一句话对照这四条，都能答出是或否。下面的每条规则，都是这四条落到某个具体组件上的结果。",
        })}
      >
        <GuidelinePairs pairs={qualityPairs} />
      </GuideSection>

      <GuideSection
        title={t({ en: "Sentence case", zh: "大小写与标点" })}
        lead={t({
          en: "Every string a component renders is written like the start of a sentence, not a title: first word capitalised, the rest left alone, and no full stop on a label. Headings, buttons, labels, menu items, badges, empty states.",
          zh: "英文字符串当作一句话的开头来写，而不是一个标题：只大写首词，其余保持原样。中文没有大小写，因此落在中文上的是另一半规则——标签、按钮、标题一律不加句末标点，也不用感叹号。标题、按钮、标签、菜单项、徽章、空状态皆然。",
        })}
      >
        <div css={[flex.col, corner.radius_2, styles.surface]}>
          <Heading level={3} variant="h4">
            {t({ en: "Recently watched", zh: "最近观看" })}
          </Heading>
          <div css={[flex.wrap, styles.controlRow]}>
            <Button variant="primary">
              {t({ en: "Add to watchlist", zh: "加入待看清单" })}
            </Button>
            <Button variant="outline">
              {t({ en: "Clear history", zh: "清除观看记录" })}
            </Button>
            <Chip>{t({ en: "In progress", zh: "观看中" })}</Chip>
            <Badge variant="success">{t({ en: "Synced", zh: "已同步" })}</Badge>
          </div>
        </div>
        <GuideNote>
          {t({
            en: 'The exception is typographic rather than editorial. Text variant="overline" and transform="uppercase" set caps as a type treatment for section labels; the words underneath are still written in sentence case. On Chinese the treatment does nothing, so those labels are carried by size and colour instead.',
            zh: '例外属于排版而非文案。Text 的 variant="overline" 与 transform="uppercase" 是把全大写当作区块标签的字体处理手法；其下的词句仍按一句话的开头来写。这套处理对中文不起作用，因此中文的区块标签改由字号与颜色来承担。',
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Name the outcome", zh: "写出结果" })}
        lead={t({
          en: "A label is what a screen reader announces and what someone scanning reads instead of the paragraph around it. Say what will be true afterwards, not which mechanism gets there.",
          zh: "标签是屏幕阅读器播报的内容，也是扫读的人用来代替周围段落去读的东西。要写出之后会成真的事，而不是达成它的机制。",
        })}
      >
        <div css={[flex.wrap, styles.controlRow]}>
          <Button variant="primary">
            {t({ en: "Send invite", zh: "发送邀请" })}
          </Button>
          <Button variant="outline">
            {t({ en: "Save and close", zh: "保存并关闭" })}
          </Button>
          <Button variant="danger">
            {t({ en: "Delete draft", zh: "删除草稿" })}
          </Button>
        </div>
        <DoDont
          do={
            <Button variant="primary">
              {t({ en: "Add to watchlist", zh: "加入待看清单" })}
            </Button>
          }
          doCaption={t({
            en: "Still says something read on its own, which is how a screen reader reads it.",
            zh: "单独读出来时依然说明了问题——屏幕阅读器正是这样读的。",
          })}
          dont={
            <Button variant="primary">{t({ en: "Submit", zh: "提交" })}</Button>
          }
          dontCaption={t({
            en: "Describes the click rather than its result. Three of these on a page are three identical buttons.",
            zh: "描述的是这一次点击，而不是点击的结果。页面上有三个这样的按钮，就等于有三个一模一样的按钮。",
          })}
        />
      </GuideSection>

      <GuideSection
        title={t({
          en: "How much each component holds",
          zh: "每个组件能装下多少",
        })}
        lead={t({
          en: "Writing past the budget doesn't overflow. It degrades quietly, differently on every screen, and a reader notices before you do.",
          zh: "写超了并不会溢出。它只会悄悄劣化，在每块屏幕上都不一样，而先察觉的是读者，不是你。",
        })}
      >
        <CopyBudgetSpecimen />
        <GuideNote>
          {t({
            en: "Nothing there overflows. The title gives up its end, the neighbours shift along, and eventually the rows break — three quiet failures, none of them loud enough to catch while you are writing.",
            zh: "上面没有任何东西溢出。标题交出了结尾，旁边的元素被一路推开，行最终被挤断——三种安静的失败，没有一种响到能在你写文案时被察觉。",
          })}
        </GuideNote>
        <GuideList items={budgets} />
      </GuideSection>

      <GuideSection
        title={t({ en: "Say it once", zh: "只说一次" })}
        lead={t({
          en: "A field has three copy slots and each answers a different question. Filling two with the same sentence is how a form doubles in length without getting any clearer.",
          zh: "字段有三处文案，各回答一个不同的问题。用同一句话填满其中两处，表单就会长出一倍，却一点也没变得更清楚。",
        })}
      >
        <UsageSnippet
          code={`<TextField
  label="Display name"                             // what is this
  description="Shown on anything you make public." // what to know first
  error="That name is taken. Try another."         // what to do now
/>`}
        />
        <div css={styles.fieldGrid}>
          <TextField
            label={t({ en: "Display name", zh: "显示名称" })}
            description={t({
              en: "Shown on anything you make public.",
              zh: "会出现在你公开的所有内容上。",
            })}
            defaultValue={t({ en: "Ada Lovelace", zh: "阿达·洛夫莱斯" })}
          />
          <TextField
            label={t({ en: "Email", zh: "电子邮箱" })}
            error={t({
              en: "That address is missing an @. Check it and try again.",
              zh: "该地址缺少 @。检查后重试。",
            })}
            defaultValue="ada.example.com"
          />
        </div>
        <GuidelinePairs pairs={descriptionPair} />
      </GuideSection>

      <GuideSection
        title={t({ en: "Errors", zh: "错误信息" })}
        lead={t({
          en: "What happened, then what to do. The reader already knows something failed; the half only you can supply is which thing, and what fixes it.",
          zh: "先说发生了什么，再说该怎么办。读者早已知道出了问题；只有你能补上的那一半，是哪里出了问题、以及怎样才能解决。",
        })}
      >
        <Callout
          variant="danger"
          title={t({ en: "Upload failed", zh: "上传失败" })}
        >
          {t({
            en: "That image is 14 MB and the limit is 10 MB. Resize it, or pick a different one.",
            zh: "该图片为 14 MB，上限是 10 MB。压缩后再传，或改选一张。",
          })}
        </Callout>
        <GuidelinePairs pairs={errorPair} />
        <GuideNote>
          {t({
            en: "Blame the system rather than the reader, and skip the apology — it costs a line and repairs nothing.",
            zh: "把过错归于系统而非读者，也不必道歉——道歉占掉一行，却修不好任何东西。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "The states written last", zh: "最后才写的那些状态" })}
        lead={t({
          en: "Anything that can hold content can hold none. An empty state is the first thing a new reader sees and the last thing anyone writes.",
          zh: "凡是能装下内容的地方，也可能什么都没有。空状态是新读者最先看到、却总是最后才被写的东西。",
        })}
      >
        <GuideList items={states} />
      </GuideSection>

      <GuideSection
        title={t({ en: "Words that don't ship", zh: "不该出现的词" })}
        lead={t({
          en: "Each of these does a specific, describable amount of damage.",
          zh: "下面每一类词造成的损害，都具体到可以说清楚。",
        })}
      >
        <GuidelinePairs pairs={bannedWords} />
        <GuideNote>
          {t({
            en: "Then the rule that outranks the list: one concept, one word, everywhere it appears — in the copy, the prop names, and the code. Decide it once and write the decision down, so the next person inherits it instead of picking a synonym.",
            zh: "还有一条压过上述清单的规则：一个概念只对应一个词，出现在哪里都用它——文案、属性名与代码皆然。这个词只定一次，并把这个决定记录下来，下一个人便可直接沿用，而不是另选一个近义词。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "One dialect", zh: "只用一种拼写" })}
        lead={t({
          en: "English copy here is en-GB. The choice matters less than the consistency: two dialects on one page reads as two authors, and a reader who notices the seam stops reading the sentence and starts reading the spelling.",
          zh: "本站英文文案统一使用英式拼写。选哪一种并不重要，一致才重要：同一页面上出现两种拼写，读起来就像出自两个人之手；读者一旦察觉这道接缝，就会从读句子转为读拼写。",
        })}
      >
        <GuidelinePairs pairs={dialectPairs} />
        <GuideNote>
          {t({
            en: 'An identifier keeps the spelling of the code it names, wherever it appears — the color.* token group, transition.colors, align="center", the /foundations/color route. So this page\'s neighbour is titled “Colour” while its URL stays /foundations/color and its specimens read color.surfaceAccent. Both are right: one is prose, the other is a contract.',
            zh: '标识符在任何位置都保持其所指代码的拼写——color.* 令牌组、transition.colors、align="center"，以及 /foundations/color 路由。因此相邻的页面标题写作「Colour」，而其网址仍是 /foundations/color，页面上的示例仍写作 color.surfaceAccent。两者都对：一个是文案，一个是契约。',
          })}
        </GuideNote>
      </GuideSection>
    </>
  );
}

// Composed over `flex.*` at the callsites.
const styles = stylex.create({
  // The quality, sat in front of its own rule; weight is the whole distinction.
  qualityName: {
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  surface: {
    gap: space._3,
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  controlRow: {
    gap: space._2,
  },
  // The words stay legible; the rule through them is what carries the verdict.
  struck: {
    textDecorationLine: "line-through",
    textDecorationColor: color.dangerText,
    textDecorationThickness: border.size_1,
    color: color.textMuted,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
    gap: space._4,
    alignItems: "start",
  },
});

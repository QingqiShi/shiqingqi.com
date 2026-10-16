"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { effectDiagnostics } from "@tuja/ui/effect-layer/effect-diagnostics";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { t } from "#src/i18n.ts";

// Lab-only diagnostics: remove before the PR. They start at module load,
// before the effect layer requests its device after hydration.
if (typeof window !== "undefined") {
  effectDiagnostics.enable();
}

const NO_DIAGNOSTICS = effectDiagnostics.read();

/** Lab-only diagnostics: the effect layer's state and log, as plain text. */
function EffectDiagnostics() {
  const { status, log } = useSyncExternalStore(
    effectDiagnostics.subscribe,
    effectDiagnostics.read,
    () => NO_DIAGNOSTICS,
  );
  const lines = [
    ...Object.entries(status).map(([key, value]) => `${key}: ${value}`),
    "— log —",
    ...log,
  ];
  return (
    <div css={stack.tight}>
      <Heading level={2} look="h3">
        {t({ en: "Effect diagnostics (lab only)", zh: "效果诊断（仅实验室）" })}
      </Heading>
      <pre
        css={[
          corner.radius_3,
          typeRole.caption,
          styles.readout,
          styles.diagnostics,
        ]}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}

const PAGE_PARAGRAPHS = 24;
const SHEET_PARAGRAPHS = 30;
const READOUT_INTERVAL_MS = 200;

function findCard() {
  return document.querySelector<HTMLElement>(
    '[role="dialog"][aria-modal="true"]',
  );
}

/** The Sheet's dim: an empty, hidden-from-AT child of the body with a black wash. */
function findDim() {
  for (const element of document.body.children) {
    if (
      element instanceof HTMLDivElement &&
      element.getAttribute("aria-hidden") === "true" &&
      element.childElementCount === 0 &&
      getComputedStyle(element).backgroundColor.startsWith("rgba(0, 0, 0,")
    ) {
      return element;
    }
  }
  return null;
}

interface Metrics {
  innerHeight: number;
  viewportHeight: number | null;
  viewportOffsetTop: number | null;
  viewportPageTop: number | null;
  clientHeight: number;
  scrollHeight: number;
  scrollY: number;
  lvh: number | null;
  safeBottom: string;
  bodyOverflow: string;
  dimTop: number | null;
  dimBottom: number | null;
  cardTop: number | null;
  cardBottom: number | null;
  visibleBottom: string;
  visibleHeight: string;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function measure(
  card: HTMLElement | null,
  dim: HTMLElement | null,
  probe: HTMLElement | null,
): Metrics {
  const viewport = window.visualViewport;
  const dimRect = dim?.getBoundingClientRect();
  const probeStyle = probe ? getComputedStyle(probe) : null;
  const cardRect = card?.getBoundingClientRect();
  // The card's parent is the Sheet's anchor, which holds the visible area.
  const anchor = card?.parentElement;
  const anchorStyle = anchor ? getComputedStyle(anchor) : null;
  return {
    innerHeight: window.innerHeight,
    viewportHeight: viewport ? round(viewport.height) : null,
    viewportOffsetTop: viewport ? round(viewport.offsetTop) : null,
    viewportPageTop: viewport ? round(viewport.pageTop) : null,
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
    scrollY: round(window.scrollY),
    lvh: probe ? round(probe.getBoundingClientRect().height) : null,
    safeBottom: probeStyle?.paddingBlockEnd ?? "",
    bodyOverflow: getComputedStyle(document.body).overflow,
    dimTop: dimRect ? round(dimRect.top) : null,
    dimBottom: dimRect ? round(dimRect.bottom) : null,
    cardTop: cardRect ? round(cardRect.top) : null,
    cardBottom: cardRect ? round(cardRect.bottom) : null,
    visibleBottom: anchorStyle?.getPropertyValue("--visible-bottom") ?? "",
    visibleHeight: anchorStyle?.getPropertyValue("--visible-height") ?? "",
  };
}

function show(value: number | string | null) {
  return value === null ? "–" : String(value);
}

function Readout({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;
  const rows: [string, string][] = [
    ["innerHeight", show(metrics.innerHeight)],
    ["visualViewport.height", show(metrics.viewportHeight)],
    ["visualViewport.offsetTop", show(metrics.viewportOffsetTop)],
    ["visualViewport.pageTop", show(metrics.viewportPageTop)],
    ["documentElement.clientHeight", show(metrics.clientHeight)],
    ["scrollHeight", show(metrics.scrollHeight)],
    ["scrollY", show(metrics.scrollY)],
    ["100lvh", show(metrics.lvh)],
    ["safe-area-inset-bottom", show(metrics.safeBottom)],
    ["body overflow", show(metrics.bodyOverflow)],
    [
      "dim top / bottom",
      `${show(metrics.dimTop)} / ${show(metrics.dimBottom)}`,
    ],
    [
      "card top / bottom",
      `${show(metrics.cardTop)} / ${show(metrics.cardBottom)}`,
    ],
    ["--visible-bottom", show(metrics.visibleBottom || null)],
    ["--visible-height", show(metrics.visibleHeight || null)],
  ];
  return (
    <dl css={[corner.radius_3, styles.readout]}>
      {rows.map(([label, value]) => (
        <div key={label} css={styles.readoutRow}>
          <dt css={[typeRole.caption, styles.readoutLabel]}>{label}</dt>
          <dd
            css={[typeRole.caption, typeModifier.numeric, styles.readoutValue]}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The keyboard readings in three short lines, to sit next to the field that
 * brings up the keyboard, where they stay in view while it is open.
 */
function KeyboardReadout({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;
  const lines = [
    `vv top ${show(metrics.viewportOffsetTop)} h ${show(metrics.viewportHeight)} page ${show(metrics.viewportPageTop)}`,
    `innerH ${show(metrics.innerHeight)} scrollY ${show(metrics.scrollY)}`,
    `visB ${show(metrics.visibleBottom || null)} visH ${show(metrics.visibleHeight || null)} card ${show(metrics.cardTop)}/${show(metrics.cardBottom)}`,
  ];
  return (
    <output
      css={[
        corner.radius_2,
        typeRole.caption,
        typeModifier.numeric,
        styles.keyboardReadout,
      ]}
    >
      {lines.map((line) => (
        <span key={line} css={styles.keyboardReadoutLine}>
          {line}
        </span>
      ))}
    </output>
  );
}

/**
 * The Sheet Lab: a page long enough to scroll, with the two sheets that need
 * a real phone to judge — a short form that brings up the keyboard, and
 * content taller than the screen. Above them, a checklist for the motion and
 * the dim, and a live readout of the viewport.
 */
export function SheetLab() {
  const [open, setOpen] = useState<"form" | "tall" | null>(null);
  const [grabber, setGrabber] = useState<"plain" | "liquid">("liquid");
  const [kind, setKind] = useState("note");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let lastRead = 0;
    let lastText = "";
    const tick = (now: number) => {
      const card = findCard();
      const dim = findDim();
      if (now - lastRead >= READOUT_INTERVAL_MS) {
        lastRead = now;
        const next = measure(card, dim, probeRef.current);
        const text = JSON.stringify(next);
        if (text !== lastText) {
          lastText = text;
          setMetrics(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  const close = () => {
    setOpen(null);
  };
  const closeLabel = t({ en: "Close", zh: "关闭" });
  const pageParagraph = t({
    en: "This page is long so that it scrolls behind the sheet. Open a sheet from the top or from the bottom of the page: the dim covers the whole page, under the browser's toolbar too, and the page stays where it was.",
    zh: "这个页面足够长，可以在面板背后滚动。可以在页面顶部或底部打开面板：暗化层覆盖整个页面，包括浏览器工具栏下方，页面也保持原位。",
  });
  const sheetParagraph = t({
    en: "Scroll this text inside the card. At the top, pull down to close the sheet; anywhere else, a pull scrolls the text.",
    zh: "在卡片内滚动这段文字。滚到顶部时向下拉即可关闭面板；其他位置向下拉只会滚动文字。",
  });
  const reloadNote = t({
    en: "Reload the page before each case: Safari keeps a toolbar colour until the next load.",
    zh: "每个用例开始前先刷新页面：Safari 会把工具栏颜色保留到下一次加载。",
  });
  const checklist = [
    t({
      en: "Open the form sheet. It slides up from below the bottom of the screen, through the toolbar, and settles above it. Close it with the close button: it slides back down off the screen. Is any edge cut at any moment?",
      zh: "打开表单面板。它从屏幕底部以下滑上来，穿过工具栏，停在工具栏上方。用关闭按钮关闭：它滑回屏幕下方。卡片的任何边缘在任何时刻被切掉了吗？",
    }),
    t({
      en: "Open it, then drag the grabber down slowly, past the bottom of the screen. Does the card stay under your finger, go under the toolbar, and leave the screen, with no fade and no hard line? Let go after a short pull: it springs back. Pull further, or flick: it slides off.",
      zh: "打开后，按住拖动条慢慢向下拖，越过屏幕底部。卡片是否一直跟着手指，滑到工具栏下面并离开屏幕，没有淡出，也没有生硬的切线？只拖一小段就松手：它弹回原位。拖得更远或快速一甩：它滑出屏幕。",
    }),
    t({
      en: "Scroll to the end of the page and open the form sheet. Does the dim reach the bottom of the screen, under the toolbar too? Close it: is the page where it was?",
      zh: "滚到页面末尾，打开表单面板。暗化层是否一直延伸到屏幕底部，包括工具栏下方？关闭后，页面是否还在原来的位置？",
    }),
    t({
      en: "At the end of the page, open the form sheet and tap the Note field. Does the whole card sit right above the keyboard, with its top in view? Is the page dimmed down to the keyboard, with no hard line? Take a screenshot that shows the readings next to the field.",
      zh: "在页面末尾打开表单面板，点击备注字段。整张卡片是否刚好位于键盘上方，顶部也在视野内？页面是否一直压暗到键盘，没有生硬的切线？截一张能看到字段旁读数的图。",
    }),
    t({
      en: "Open the tall sheet and swipe its content down and up: it scrolls. Once it is at its top, a new swipe down drags the sheet. A swipe down on the title row drags it from anywhere. Do the same with the keyboard open in the form sheet.",
      zh: "打开长内容面板，在内容上上下滑动：内容滚动。滚到顶部后，再向下滑会拖动面板。在标题行上向下滑，无论内容滚到哪里都会拖动面板。在表单面板中打开键盘后再试一次。",
    }),
    t({
      en: "With the liquid grabber, open a sheet: as the card lands, the bar swells into a drop of water, sloshes, stays wet for a moment, sets from its core out and shrinks back into the bar. Hold the grabber: it swells under your finger; move sideways and it leans; pull up past the top and it draws up into a drop on a neck; let go and it snaps back and sloshes. Flick it away: it streaks as the card drops. It is the same water as a Switch's thumb mid-toggle. Switch to the plain grabber and compare. The Kind control inside the form sheet pours its liquid over the card.",
      zh: "选择液态拖动条后打开面板：卡片落定时，横条涨成一滴水，晃荡，湿润片刻后从核心向外凝固，再缩回横条。按住拖动条：它在指下涨起；左右移动时它倾斜；向上拖过顶部时被拉成带颈的水滴；松手后它弹回并晃荡。快速一甩关闭：它随卡片下落拖出水痕。它与开关滑块切换时的水是同一种材质。切换到普通拖动条做对比。表单面板中的“类型”控件会把液体泼在卡片上方。",
    }),
  ];

  const grabberControl = (
    <SegmentedControl
      aria-label={t({ en: "Grabber", zh: "拖动条" })}
      value={grabber}
      options={[
        { value: "plain", label: t({ en: "Plain", zh: "普通" }) },
        { value: "liquid", label: t({ en: "Liquid", zh: "液态" }) },
      ]}
      onChange={setGrabber}
    />
  );

  const triggers = (
    <div css={cluster.item}>
      <Button
        look="primary"
        onClick={() => {
          setOpen("form");
        }}
      >
        {t({ en: "Open the form sheet", zh: "打开表单面板" })}
      </Button>
      <Button
        onClick={() => {
          setOpen("tall");
        }}
      >
        {t({ en: "Open the tall sheet", zh: "打开长内容面板" })}
      </Button>
    </div>
  );

  return (
    <div css={[stack.group, styles.lab]}>
      <div ref={probeRef} css={styles.probe} aria-hidden="true" />
      <EffectDiagnostics />

      <div css={stack.item}>
        <Heading level={2} look="h3">
          {t({ en: "Sheet checklist", zh: "Sheet 检查清单" })}
        </Heading>
        <Text>{reloadNote}</Text>
        <ol css={[stack.tight, styles.checklist]}>
          {checklist.map((item) => (
            <li key={item} css={styles.checklistItem}>
              <Text as="span">{item}</Text>
            </li>
          ))}
        </ol>
      </div>

      <Readout metrics={metrics} />
      {grabberControl}
      {triggers}
      <div css={stack.item}>
        {Array.from({ length: PAGE_PARAGRAPHS }, (_, index) => (
          <Text key={index}>{pageParagraph}</Text>
        ))}
      </div>
      {triggers}

      <Sheet
        isOpen={open === "form"}
        onClose={close}
        closeLabel={closeLabel}
        title={t({ en: "Add a note", zh: "添加备注" })}
        grabber={grabber}
      >
        <form
          css={stack.item}
          onSubmit={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <KeyboardReadout metrics={metrics} />
          <SegmentedControl
            aria-label={t({ en: "Kind", zh: "类型" })}
            fullWidth
            value={kind}
            options={[
              { value: "note", label: t({ en: "Note", zh: "备注" }) },
              { value: "task", label: t({ en: "Task", zh: "任务" }) },
              { value: "idea", label: t({ en: "Idea", zh: "想法" }) },
            ]}
            onChange={setKind}
          />
          <TextField
            label={t({ en: "Note", zh: "备注" })}
            description={t({
              en: "Focus the field: the card rises above the keyboard.",
              zh: "聚焦这个字段：卡片会升到键盘上方。",
            })}
          />
          <Button type="submit" look="primary" size="lg">
            {t({ en: "Save", zh: "保存" })}
          </Button>
          <Readout metrics={metrics} />
        </form>
      </Sheet>

      <Sheet
        isOpen={open === "tall"}
        onClose={close}
        closeLabel={closeLabel}
        title={t({ en: "A long read", zh: "长篇内容" })}
        grabber={grabber}
      >
        <div css={stack.item}>
          <Readout metrics={metrics} />
          {Array.from({ length: SHEET_PARAGRAPHS }, (_, index) => (
            <Text key={index}>{sheetParagraph}</Text>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

const styles = stylex.create({
  lab: {
    position: "relative",
  },
  // Measures 100lvh and the bottom safe area. It is absolute, not fixed, so
  // that it stays out of the status bar's sampling.
  probe: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: 0,
    blockSize: "100lvh",
    paddingBlockEnd: "env(safe-area-inset-bottom)",
    boxSizing: "content-box",
    visibility: "hidden",
    pointerEvents: "none",
  },
  checklist: {
    margin: 0,
    paddingInlineStart: space._4,
  },
  checklistItem: {
    paddingInlineStart: space._1,
  },
  readout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
    columnGap: rhythm.item,
    margin: 0,
    padding: space._2,
    backgroundColor: color.bgNeutralSubtle,
  },
  // A fixed height, so that a line the log adds while a sheet opens does
  // not move the page under the scroll position.
  diagnostics: {
    display: "block",
    margin: 0,
    blockSize: "16rem",
    overflowY: "auto",
    fontFamily: font.familyMono,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  readoutRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: rhythm.tight,
  },
  readoutLabel: {
    color: color.fgMuted,
  },
  readoutValue: {
    margin: 0,
    fontFamily: font.familyMono,
  },
  keyboardReadout: {
    display: "flex",
    flexDirection: "column",
    paddingBlock: space._1,
    paddingInline: space._2,
    fontFamily: font.familyMono,
    color: color.fgMuted,
    backgroundColor: color.bgNeutralSubtle,
  },
  keyboardReadoutLine: {
    whiteSpace: "nowrap",
    overflowX: "hidden",
    textOverflow: "ellipsis",
  },
});

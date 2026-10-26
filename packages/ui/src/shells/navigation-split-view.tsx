"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";
import { Button } from "../actions/button.tsx";
import { PlainAnchor } from "../actions/tab-bar.tsx";
import { isPlainClick } from "../actions/use-tab-press.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useDust } from "../effect-layer/use-dust.ts";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { useExtractorFan } from "../effect-layer/use-extractor-fan.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { findTwinElement } from "../focus/find-twin-element.ts";
import { isRendered } from "../focus/is-rendered.ts";
import { mergeRefs } from "../merge-refs.ts";
import {
  createPendingSnapshot,
  type PendingSnapshot,
} from "../motion/create-pending-snapshot.ts";
import { movingMarker } from "../motion/moving-marker.stylex.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import { pageGutter } from "../primitives/page-column.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { islandSurface, islandTokens } from "../surfaces/island.stylex.ts";
import { SheetRecedeContext } from "../surfaces/sheet-recede-context.ts";
import { Sheet } from "../surfaces/sheet.tsx";
import {
  releaseVelocity,
  type DragSample,
} from "../surfaces/should-dismiss.ts";
import {
  color,
  controlHeight,
  layer,
  rhythm,
  shadow,
  space,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  claimEdgeSwipe,
  EDGE_SWIPE_ZONE,
  shouldPop,
} from "./claim-edge-swipe.ts";
import { createPageScroll, type PageScroll } from "./create-page-scroll.ts";
import {
  addSplitViewMark,
  createSplitViewMotion,
  type SplitViewChange,
  type SplitViewMotion,
  type SplitViewMarkElement,
  type SplitViewMarks,
  type SplitViewSnapshot,
} from "./create-split-view-motion.ts";
import {
  followPage,
  settlePages,
  type SplitViewPage,
  type SplitViewPages,
} from "./follow-page.ts";
import { liftOrigin } from "./lift-origin.ts";
import {
  splitViewDisplay,
  splitViewQueries,
  splitViewWidths,
} from "./navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "./navigation-split-view.stylex.ts";
import { normalizeUrl } from "./normalize-url.ts";
import { tabViewTokens } from "./tab-view.stylex.ts";

/**
 * The narrowest view, in rem, where the detail shows beside the content:
 * the collapsed sidebar, 20rem of content, the detail and the gaps around
 * the islands. It is the same width as `splitViewQueries.detailBeside`.
 */
const DETAIL_BESIDE_MIN_REM = 50.75;

/** The props that `NavigationSplitView` hands its `linkComponent`. */
export interface SplitViewLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** The way back from a column to the column under it. */
export interface SplitViewBackLink {
  /** The URL of the column under this one. */
  href: string;
  /**
   * The name of the column under this one, such as "Net worth · Cash". The
   * back link of the content shows it, and the detail shows it before its
   * own label, as a breadcrumb.
   */
  label: string;
}

/** One column of a `NavigationSplitView`. */
export interface NavigationSplitViewColumn {
  /**
   * What the column shows. The column lays it out as a flex column at least
   * as tall as the column, so a node with `flexGrow: 1` fills the height that
   * its content leaves, such as for a chart.
   */
  node: ReactNode;
  /** Names the column's region for assistive technology. */
  label: string;
  /**
   * Changes when the column shows other content, such as another picked
   * row: the column then starts at the top. In the detail, the old content
   * also fades out and the new content fades in.
   */
  key?: string | null;
  /**
   * The way back to the column under this one. The column shows it as a
   * link at its top, at every width.
   */
  back?: SplitViewBackLink | null;
  /**
   * A control that floats at the bottom end of the column, such as an Add
   * action, over the content that scrolls under it. It stays above the
   * floating tab bar of a `TabView`, and the column keeps room for it after
   * its content, so the last row scrolls clear of it.
   */
  accessory?: ReactNode;
}

/** The detail of a `NavigationSplitView`. */
export interface NavigationSplitViewDetail extends Omit<
  NavigationSplitViewColumn,
  "accessory" | "back"
> {
  /**
   * The way back to the content. The close button and Esc go there. Beside
   * the content, the detail shows `back.label` › `label` above its node.
   */
  back: SplitViewBackLink;
}

/** What `useSplitViewColumn` tells a column about itself. */
export interface SplitViewColumnState {
  /** Which column this is. The collapsed sidebar is the sidebar. */
  column: "sidebar" | "content" | "detail";
  /**
   * `"sheet"` where the detail shows in a sheet over the content, as on a
   * phone, and `"column"` everywhere else.
   */
  presentation: "column" | "sheet";
  /**
   * The box that scrolls the column, `null` until it mounts and in a sheet,
   * and `undefined` where the page scrolls the column, as on a phone inside
   * a `TabView`. Give it to a virtual list as its scroll parent, or the
   * window where it is `undefined`.
   */
  scroller: HTMLElement | null | undefined;
  /**
   * Takes this column off and goes back to the column under it, as its close
   * button does. `null` where the column has no `back`.
   */
  close: (() => void) | null;
}

const SplitViewColumnContext = createContext<SplitViewColumnState | null>(null);

interface SplitViewState {
  linkComponent: ComponentType<SplitViewLinkProps>;
  /** Follows a column link of `column`, by the history rule of the view. */
  follow: (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    column: SplitViewColumnState["column"],
  ) => void;
}

const SplitViewContext = createContext<SplitViewState | null>(null);

/**
 * Which column is around the caller, and the box that scrolls it. `null`
 * outside a `NavigationSplitView`.
 */
export function useSplitViewColumn() {
  return use(SplitViewColumnContext);
}

/**
 * The elements of each Shared element of the view around, `null` outside a
 * view.
 */
const SplitViewMarksContext = createContext<SplitViewMarks | null>(null);

/**
 * What the Column links of a sidebar form do with dust while the sidebar
 * folds: the form that goes sheds it, and the form that comes pulls it in.
 */
const SplitViewDustContext = createContext<"shed" | "pull" | null>(null);

/** How much dust a Column link of the sidebar form that goes sheds. */
const FOLD_DUST_DENSITY = 60;
/** How far a Column link of the sidebar form that comes pulls dust in, in px. */
const FOLD_FAN_REACH = 360;

/**
 * Marks an element as one form of the Shared element `name`, such as an
 * account's avatar in the sidebar, its tile in the Collapsed sidebar, or a
 * chart in the content and its compact form in the sidebar. Attach the
 * returned ref. When a navigation hides the form that showed and shows
 * another, the view flies one into the other. When a navigation moves the
 * one form, such as a list that a new chart above it pushes down, the view
 * moves it there. A form can be a part of an SVG drawing, such as the line
 * of a chart, which stretches as it flies. A Shared element can hold
 * others, such as a chart that holds its line and its labels: they fly on
 * their own, the form it leaves stays, and the rest of the form it goes to
 * shows as they land. Give each form a box of its own, and give one name to
 * at most one form that shows at a time. Outside a `NavigationSplitView`,
 * and for a `null` name, the ref does nothing.
 */
export function useSplitViewShared(
  name: string | null,
  { fade = "cross" }: SplitViewSharedOptions = {},
) {
  const marks = use(SplitViewMarksContext);
  return (element: SplitViewMarkElement | null) => {
    if (element === null || marks === null || name === null) return undefined;
    return addSplitViewMark(marks, name, element, { fade });
  };
}

export interface SplitViewSharedOptions {
  /**
   * How the two forms of the Shared element change over while it flies:
   * `"cross"` cross-fades them, and `"dip"` fades it out most of the way at
   * the middle of its flight and back in as it lands. Use `"dip"` for a
   * label that rides along with a part that changes shape, such as the
   * value at the top of a chart.
   *
   * @default "cross"
   * @zh 共享元素飞行时两种形态如何交替：`"cross"` 交叉淡化；`"dip"` 在飞行中途淡出大半，落地时再淡入。用于随一个改变形状的部分一起移动的标签，例如图表顶端的数值。
   */
  fade?: "cross" | "dip";
}

/**
 * A link in a column that opens or changes the column after it, such as a
 * row of a list. It renders the view's `linkComponent` and follows the
 * history rule of the view. J and K move focus between the column links of
 * one column. Pass it as the link component of a row, such as `ListRow`'s.
 * While the sidebar folds, the links of the form that goes dissolve into
 * dust that the links of the form that comes pull in, on the effect layer.
 */
export function SplitViewLink({ onClick, ref, ...props }: SplitViewLinkProps) {
  const view = use(SplitViewContext);
  const column = use(SplitViewColumnContext);
  const dust = use(SplitViewDustContext);
  const dustRef = useDust({ density: dust === "shed" ? FOLD_DUST_DENSITY : 0 });
  const fanRef = useExtractorFan({
    reach: dust === "pull" ? FOLD_FAN_REACH : 0,
  });
  const linkRef = mergeRefs(ref, dustRef, fanRef);
  const LinkComponent = view?.linkComponent ?? PlainAnchor;
  return (
    <LinkComponent
      {...props}
      ref={linkRef}
      data-split-view-link=""
      onClick={(event) => {
        onClick?.(event);
        if (view !== null && column !== null) {
          view.follow(event, props.href, column.column);
        }
      }}
    />
  );
}

/**
 * Shows its children only where the content fills the view and covers the
 * sidebar, as on a phone. CSS decides, so the first paint is right, also from
 * the server. Outside a `NavigationSplitView`, it shows nothing.
 */
export function StackedOnly({ children }: { children: ReactNode }) {
  return <div css={styles.stackedOnly}>{children}</div>;
}

/**
 * Shows its children only where the content does not fill the view, so
 * that a column shows beside it. It is the opposite of `StackedOnly`. CSS
 * decides. Outside a `NavigationSplitView`, it shows them.
 */
export function UnlessStacked({ children }: { children: ReactNode }) {
  return <div css={styles.unlessStacked}>{children}</div>;
}

/**
 * Shows its children only where the view does not show the full sidebar:
 * where the collapsed sidebar shows, or no sidebar. Use it for what the
 * full sidebar shows otherwise, such as the title of the screen. CSS
 * decides. Outside a `NavigationSplitView`, it shows them.
 */
export function UnlessFullSidebar({ children }: { children: ReactNode }) {
  return <div css={styles.unlessFullSidebar}>{children}</div>;
}

interface NavigationSplitViewProps {
  /**
   * The first column, such as a list of accounts. It shows full where it
   * fits beside the content and no detail shows beside them.
   *
   * @zh 第一栏，例如账户列表。在它能放在内容栏旁边、且旁边没有详情栏时，完整显示。
   */
  sidebar?: NavigationSplitViewColumn | null;
  /**
   * The narrow form of the sidebar, such as a strip of logos. It shows while
   * the detail shows beside the content, and where the full sidebar does not
   * fit but the view is wider than a phone. It takes the label and the key
   * of `sidebar`, and shows only with a `sidebar`.
   *
   * @zh 侧栏的窄形态，例如一列标志。详情栏显示在内容栏旁边时显示它；在完整侧栏放不下、但视图比手机宽时也显示它。它沿用 `sidebar` 的标签与 key，且只在有 `sidebar` 时显示。
   */
  collapsedSidebar?: ReactNode;
  /**
   * The middle column, such as one account and its ledger. It takes the
   * width that the other columns leave.
   *
   * @zh 中间一栏，例如一个账户及其账目。它占用其他各栏留下的宽度。
   */
  content: NavigationSplitViewColumn;
  /**
   * The last column, such as the editor of a picked transaction. Pass it
   * only while something is picked. It shows beside the content where both
   * fit, and in a sheet over the content where they do not, as on a phone.
   *
   * @zh 最后一栏，例如所选交易的编辑器。只在有选中项时传入。两者放得下时显示在内容栏旁边；放不下时（例如在手机上）以覆盖内容栏的面板显示。
   */
  detail?: NavigationSplitViewDetail | null;
  /**
   * Accessible label of the detail's close button, beside the content and
   * in the sheet. The package ships no i18n, so the consumer supplies the
   * localised string.
   *
   * @zh 详情栏关闭按钮的可访问标签，在内容栏旁边与面板中都会用到。本包不内置 i18n，请由调用方提供本地化字符串。
   */
  closeLabel: string;
  /**
   * Link Slot — renders each back link and each `SplitViewLink`. Defaults to
   * a plain `<a>`; pass a framework link to keep client-side navigation.
   * Forward every prop it is handed onto the rendered anchor.
   *
   * @zh 链接插槽——渲染各栏的返回链接与每个 `SplitViewLink`。默认为原生 `<a>`；传入框架自带的链接组件即可保留客户端导航。请把收到的每一个 prop 都转发到渲染出的锚点上。
   */
  linkComponent?: ComponentType<SplitViewLinkProps>;
  /**
   * Replaces the current history entry with `href`, as a router's
   * `replace` does. The view calls it where the history rule replaces.
   * Defaults to `location.replace`; pass the router's to keep client-side
   * navigation.
   *
   * @zh 用 `href` 替换当前的历史记录项，与路由器的 `replace` 相同。视图在历史规则要求替换时调用它。默认为 `location.replace`；传入路由器的方法即可保留客户端导航。
   */
  replace?: (href: string) => void;
  /**
   * StyleX styles merged over the view's own.
   *
   * @zh 合并到视图自身样式之上的 StyleX 样式。
   */
  css?: StyleProp;
}

/**
 * Up to three columns side by side, each in its own scroll box, as tall as
 * the screen: a sidebar, the content, and the detail of what is picked. The
 * consumer decides what is picked, normally from the URL, and passes the
 * columns that show it.
 *
 * The view fits the columns to the width it gets, not to the screen. While
 * a detail shows beside the content, the sidebar folds to the collapsed
 * sidebar. Without one, the sidebar shows full where it fits, collapsed
 * where it does not, and not at all on a phone, where the content fills the
 * view. Where the detail does not fit beside the content, it shows in a
 * sheet over it. A change of the composition keeps each column and its
 * scroll. Inside a `TabView` narrower than 30rem, as on a phone, the page
 * scrolls the content instead of its scroll box, so that it goes under the
 * status bar of the browser, and each page of the content keeps its own
 * scroll.
 *
 * History: a column link (`SplitViewLink`) that opens a column deeper than
 * those that show pushes an entry. One that changes what a column already
 * shows replaces the entry, so that Back still takes off one column at a
 * time. Taking a column off — its back link, the close button, Esc, ← or a
 * dismissed sheet — goes back one entry where that entry is the column
 * under it, and else replaces the entry with the `back` URL, such as after
 * a reload. Thus no take-off leaves an entry that Back must step through.
 *
 * Keys, unless focus is in a field, a sheet or a dialog: Esc and ← take the
 * deepest column off. J and K move focus to the next and the previous
 * column link in the column that has focus, and Enter and → follow it.
 *
 * Motion follows the URL, after the first paint. A deeper column page
 * springs in over the page it leaves, which drifts back and dims, and a
 * shallower one springs back out. A detail slides in beside the content
 * while the sidebar folds, and the Shared elements (`useSplitViewShared`)
 * fly between their forms. Where the content is stacked, a drag from the
 * start edge of the content takes it off. A navigation in the middle of a
 * motion starts from where the motion is. Under reduced motion, each change
 * is a short cross-fade. The Shared elements fly only for a navigation that
 * the view starts, such as from a column link or a back link, and for Back
 * and Forward of the browser. Another navigation, such as a `router.push`
 * after a form, moves the columns and the pages only.
 */
export function NavigationSplitView({
  sidebar,
  collapsedSidebar,
  content,
  detail,
  closeLabel,
  linkComponent = PlainAnchor,
  replace = replaceLocation,
  css,
}: NavigationSplitViewProps) {
  const [view, setView] = useState<HTMLElement | null>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [marks] = useState<SplitViewMarks>(() => new Map());
  const detailBeside = useDetailBeside(view);
  const hasSidebar = sidebar != null;
  const hasCollapsed = hasSidebar && collapsedSidebar != null;
  const asSheet = detail != null && detailBeside === false;
  const detailColumn = asSheet ? null : (detail ?? null);
  const hasDetailColumn = detailColumn !== null;
  const deepest = detail ?? content;
  const deepestBack = deepest.back ?? null;

  // Each column keeps the pages that a motion still shows, and a change of
  // the URL is a motion of the next number.
  const [motion, setMotion] = useState<{ id: number; change: SplitViewChange }>(
    { id: 0, change: { content: null, detail: null } },
  );
  const [settled, setSettled] = useState(0);
  const nextMotion = motion.id + 1;
  const [pages, setPages] = useState<SplitViewPages<NavigationSplitViewColumn>>(
    () => ({ under: null, current: pageOf(content, 0), leaving: null }),
  );
  const [details, setDetails] =
    useState<SplitViewPages<NavigationSplitViewDetail> | null>(() =>
      detailColumn === null ? null : pagesOf(detailColumn),
    );
  const [goneDetail, setGoneDetail] =
    useState<SplitViewPage<NavigationSplitViewDetail> | null>(null);

  let nextPages = pages;
  let contentChange: SplitViewChange["content"] = null;
  if (pages.current.key !== (content.key ?? "")) {
    const followed = followPage(pages, pageOf(content, nextMotion));
    nextPages = followed.pages;
    contentChange = followed.change;
  } else if (pages.current.column !== content) {
    nextPages = { ...pages, current: pageOf(content, 0) };
  }
  nextPages = settlePages(nextPages, settled);
  if (nextPages !== pages) setPages(nextPages);

  // A detail that moves out of the sheet, as when the view grows, is no
  // motion.
  const [hadDetail, setHadDetail] = useState(detail != null);
  if (hadDetail !== (detail != null)) setHadDetail(detail != null);
  let nextDetails = details;
  let nextGone = goneDetail;
  let detailChange: SplitViewChange["detail"] = null;
  if (detailColumn !== null) {
    if (details === null) {
      if (!hadDetail) detailChange = "in";
      nextDetails = pagesOf(detailColumn);
      nextGone = null;
    } else if (details.current.key !== (detailColumn.key ?? "")) {
      detailChange = "swap";
      nextDetails = followPage(details, pageOf(detailColumn, nextMotion)).pages;
    } else if (details.current.column !== detailColumn) {
      nextDetails = { ...details, current: pageOf(detailColumn, 0) };
    }
  } else if (details !== null) {
    nextDetails = null;
    // A detail that moves into the sheet goes at once.
    if (detail == null) {
      detailChange = "out";
      nextGone = { ...details.current, motion: nextMotion };
    }
  }
  if (nextDetails !== null) nextDetails = settlePages(nextDetails, settled);
  if (nextGone !== null && nextGone.motion <= settled) nextGone = null;
  if (nextDetails !== details) setDetails(nextDetails);
  if (nextGone !== goneDetail) setGoneDetail(nextGone);

  if (contentChange !== null || detailChange !== null) {
    setMotion({
      id: nextMotion,
      change: { content: contentChange, detail: detailChange },
    });
  }

  const engine = useMotionEngine();
  const motionRef = useRef<SplitViewMotion | null>(null);
  // Where the Shared elements show before a navigation of the view, for the
  // motion that the navigation brings. Until that motion, it is read again
  // at each frame, scroll and commit, as the data can come much later.
  const pendingRef = useRef<PendingSnapshot<SplitViewSnapshot> | null>(null);
  const pageScrollRef = useRef<PageScroll | null>(null);
  const capture = (to: string) => {
    pageScrollRef.current?.remember();
    pendingRef.current?.take(normalizeUrl(to));
  };
  const recapture = useEffectEvent(() => {
    pendingRef.current?.refresh();
  });
  const [folding, setFolding] = useState<"fold" | "unfold" | null>(null);
  useLayoutEffect(() => {
    if (view === null || layer === null) return;
    const created = createSplitViewMotion(engine, view, layer, marks, {
      onFold: setFolding,
      onSettled: (id) => {
        setSettled((current) => Math.max(current, id));
      },
      onFrame: () => {
        recapture();
      },
    });
    motionRef.current = created;
    pendingRef.current = createPendingSnapshot(() => created.capture());
    return () => {
      created.destroy();
      motionRef.current = null;
      pendingRef.current = null;
    };
  }, [engine, view, layer, marks]);

  const shownKey = useEffectEvent(() => content.key ?? "");
  const [pageScrolls, setPageScrolls] = useState(false);
  useLayoutEffect(() => {
    if (view === null) return;
    const created = createPageScroll(view, shownKey(), setPageScrolls);
    pageScrollRef.current = created;
    return () => {
      created.destroy();
      pageScrollRef.current = null;
    };
  }, [view]);

  useLayoutEffect(() => {
    if (motion.id === 0) return;
    // The page scrolls before the motion measures where the pages show.
    pageScrollRef.current?.follow(shownKey(), motion.change.content);
    const created = motionRef.current;
    if (created === null) return;
    const here = normalizeUrl(window.location.href);
    const snapshot = pendingRef.current?.claim(here, true) ?? null;
    created.play(snapshot, motion.change, motion.id);
  }, [motion]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pending.claim(normalizeUrl(window.location.href), false);
    pending.refresh();
  });

  const captureHistoryStep = useEffectEvent((to: string) => {
    capture(to);
  });
  useEffect(() => {
    if (view === null) return;
    const onScroll = () => {
      recapture();
    };
    view.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    const stopHistorySteps = onHistoryStep(captureHistoryStep);
    return () => {
      view.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("scroll", onScroll);
      stopHistorySteps();
    };
  }, [view]);

  const leavingRef = useRef<string | null>(null);
  const pushedRef = useRef<{ from: string; to: string } | null>(null);
  const pressedRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    leavingRef.current = null;
  }, [deepest.key, deepestBack?.href]);

  const takeOff = (href: string) => {
    if (leavingRef.current === window.location.href) return;
    leavingRef.current = window.location.href;
    capture(href);
    if (previousEntryUrl(pushedRef.current) === normalizeUrl(href)) {
      window.history.back();
    } else {
      replace(href);
    }
  };

  const follow: SplitViewState["follow"] = (event, href, column) => {
    if (event.defaultPrevented || !isPlainClick(event)) return;
    pressedRef.current = event.currentTarget;
    const target = normalizeUrl(href);
    if (target === normalizeUrl(window.location.href)) {
      event.preventDefault();
      return;
    }
    const backs = [content.back, detail?.back];
    if (
      backs.some((back) => back != null && normalizeUrl(back.href) === target)
    ) {
      event.preventDefault();
      takeOff(href);
      return;
    }
    const changesShownColumn =
      column === "sidebar"
        ? content.back != null
        : column === "content" && detail != null;
    capture(href);
    if (changesShownColumn) {
      event.preventDefault();
      replace(href);
      return;
    }
    pushedRef.current = {
      from: normalizeUrl(window.location.href),
      to: target,
    };
  };

  useStackFocus(
    view,
    hasDetailColumn ? "detail" : "content",
    (hasDetailColumn ? detailColumn.key : content.key) ?? null,
  );
  useColumnKeys(view, deepestBack, takeOff);
  useEdgeSwipe(view, motionRef, pageScrollRef, content.back ?? null, takeOff);

  const [lastSheet, setLastSheet] = useState<NavigationSplitViewDetail | null>(
    null,
  );
  if (asSheet && (lastSheet === null || lastSheet.key !== detail.key)) {
    setLastSheet(detail);
  }
  const sheet = asSheet ? detail : lastSheet;
  // A sheet can close after the URL changes, for example on Back. Then it
  // goes back into the link to the URL that it showed.
  const sheetHrefRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (asSheet) sheetHrefRef.current = window.location.href;
  });

  const viewState: SplitViewState = { linkComponent, follow };
  const closeOf = (back: SplitViewBackLink | null | undefined) =>
    back == null
      ? null
      : () => {
          takeOff(back.href);
        };

  const sidebarForms: readonly ("full" | "collapsed")[] = hasCollapsed
    ? ["full", "collapsed"]
    : ["full"];
  const dustOf = (form: "full" | "collapsed") => {
    if (folding === null) return null;
    return (folding === "fold") === (form === "full") ? "shed" : "pull";
  };
  const contentPages: ColumnPage[] = [
    ...(pages.under === null
      ? []
      : [{ ...pages.under, role: "under" as const }]),
    { key: content.key ?? "", column: content, role: "current" },
    ...(pages.leaving === null
      ? []
      : [{ ...pages.leaving, role: "leaving" as const }]),
  ];
  const shownDetail = detailColumn ?? goneDetail?.column ?? null;
  const detailPages: ColumnPage[] =
    shownDetail === null
      ? []
      : [
          { key: shownDetail.key ?? "", column: shownDetail, role: "current" },
          ...(details?.leaving == null
            ? []
            : [{ ...details.leaving, role: "leaving" as const }]),
        ];

  return (
    <SplitViewContext value={viewState}>
      <SplitViewMarksContext value={marks}>
        <div ref={setView} css={[styles.view, movingMarker, css]}>
          <div
            css={[
              islandSurface.frame,
              styles.columns,
              hasSidebar && !hasDetailColumn && styles.fullSidebarBesideContent,
            ]}
          >
            {hasSidebar
              ? sidebarForms.map((form) => (
                  <SplitViewDustContext key={form} value={dustOf(form)}>
                    <Column
                      column="sidebar"
                      form={form}
                      pageScrolls={pageScrolls}
                      label={sidebar.label}
                      pages={[
                        {
                          key: sidebar.key ?? "",
                          role: "current",
                          column: {
                            ...sidebar,
                            node:
                              form === "full" ? sidebar.node : collapsedSidebar,
                          },
                        },
                      ]}
                      close={null}
                      css={[
                        sidebarStyles.base,
                        form === "full"
                          ? sidebarStyles.full
                          : sidebarStyles.collapsed,
                        sidebarShownStyle(form, hasDetailColumn),
                      ]}
                      contentCss={
                        form === "full"
                          ? sidebarStyles.fullContent
                          : sidebarStyles.collapsedContent
                      }
                    />
                  </SplitViewDustContext>
                ))
              : null}
            <Column
              column="content"
              pageScrolls={pageScrolls}
              label={content.label}
              pages={contentPages}
              close={closeOf(content.back)}
              css={[
                contentStyles.base,
                !hasDetailColumn &&
                  (hasCollapsed
                    ? contentStyles.stackedBelowCollapsed
                    : hasSidebar && contentStyles.stackedBelowSidebar),
              ]}
              scrollerCss={content.back != null && contentStyles.swipes}
              contentCss={contentStyles.content}
              top={(column) =>
                column.back == null ? null : (
                  <BackLink back={column.back} onTakeOff={takeOff} />
                )
              }
            />
            {shownDetail === null ? null : (
              <Column
                column="detail"
                pageScrolls={pageScrolls}
                label={shownDetail.label}
                isLeaving={detailColumn === null}
                pages={detailPages}
                close={detailColumn === null ? null : closeOf(shownDetail.back)}
                header={
                  <DetailHeader
                    back={shownDetail.back}
                    label={shownDetail.label}
                    closeLabel={closeLabel}
                    onClose={() => {
                      takeOff(shownDetail.back.href);
                    }}
                  />
                }
                css={[
                  detailStyles.base,
                  detailColumn === null && detailStyles.leaving,
                ]}
                contentCss={[contentStyles.content, detailStyles.content]}
              />
            )}
          </div>
          <div ref={setLayer} aria-hidden inert css={styles.flights} />
        </div>
        <SheetRecedeContext value={view}>
          <Sheet
            isOpen={asSheet}
            onClose={() => {
              if (sheet !== null) takeOff(sheet.back.href);
            }}
            closeLabel={closeLabel}
            aria-label={sheet?.label ?? closeLabel}
            liftFrom={() => {
              const pressed = pressedRef.current;
              pressedRef.current = null;
              const href = asSheet
                ? window.location.href
                : sheetHrefRef.current;
              return view === null ? null : liftOrigin(view, pressed, href);
            }}
          >
            {sheet === null ? null : (
              <SplitViewColumnContext
                value={{
                  column: "detail",
                  presentation: "sheet",
                  scroller: null,
                  close: closeOf(sheet.back),
                }}
              >
                {sheet.node}
              </SplitViewColumnContext>
            )}
          </Sheet>
        </SheetRecedeContext>
      </SplitViewMarksContext>
    </SplitViewContext>
  );
}

function pageOf<
  Column extends NavigationSplitViewColumn | NavigationSplitViewDetail,
>(column: Column, motion: number): SplitViewPage<Column> {
  return { key: column.key ?? "", column, deep: column.back != null, motion };
}

function pagesOf<
  Column extends NavigationSplitViewColumn | NavigationSplitViewDetail,
>(column: Column): SplitViewPages<Column> {
  return { under: null, current: pageOf(column, 0), leaving: null };
}

/**
 * Calls `onStep` with the URL that Back or Forward of the browser goes to,
 * before the router changes the DOM. Gives the cleanup.
 */
function onHistoryStep(onStep: (to: string) => void) {
  // React commits the router's transition of a popstate event before the
  // next popstate listener runs. The navigate event comes before popstate.
  const navigation = "navigation" in window ? window.navigation : null;
  if (navigation !== null) {
    const onNavigate = (event: NavigateEvent) => {
      if (event.navigationType === "traverse") onStep(event.destination.url);
    };
    navigation.addEventListener("navigate", onNavigate);
    return () => {
      navigation.removeEventListener("navigate", onNavigate);
    };
  }
  const onPopState = () => {
    onStep(window.location.href);
  };
  window.addEventListener("popstate", onPopState, { capture: true });
  return () => {
    window.removeEventListener("popstate", onPopState, { capture: true });
  };
}

function replaceLocation(href: string) {
  window.location.replace(href);
}

/**
 * The URL of the history entry before this one, where the browser tells it,
 * and else where a column link of the view pushed this entry.
 */
function previousEntryUrl(pushed: { from: string; to: string } | null) {
  if ("navigation" in window && window.navigation.currentEntry !== null) {
    const index = window.navigation.currentEntry.index;
    const url = index > 0 ? window.navigation.entries()[index - 1]?.url : null;
    return url == null ? null : normalizeUrl(url);
  }
  return pushed !== null && pushed.to === normalizeUrl(window.location.href)
    ? pushed.from
    : null;
}

/**
 * Whether the detail fits beside the content, from the width of the view:
 * `null` until the view is measured.
 */
function useDetailBeside(view: HTMLElement | null) {
  const [beside, setBeside] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    if (view === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.borderBoxSize[0].inlineSize;
      if (width === 0) return;
      const rem =
        Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ) || 16;
      setBeside(width / rem >= DETAIL_BESIDE_MIN_REM);
    });
    observer.observe(view);
    return () => {
      observer.disconnect();
    };
  }, [view]);
  return beside;
}

/** Where the full or the collapsed sidebar shows, each a column of its own. */
function sidebarShownStyle(form: "full" | "collapsed", hasDetail: boolean) {
  if (hasDetail) {
    return form === "full"
      ? sidebarStyles.hidden
      : sidebarStyles.collapsedBesideDetail;
  }
  return form === "full"
    ? sidebarStyles.fullBesideContent
    : sidebarStyles.collapsedBesideContent;
}

function isShown(element: Element) {
  return isRendered(element, { visibilityProperty: true });
}

/** True where a key press belongs to a field. */
function isTyping(target: Element | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select, [role=combobox]") !== null;
}

/** True where an arrow key moves inside a control, such as a radio group. */
function ownsArrowKeys(target: Element | null) {
  return (
    target?.closest(
      "[role=radiogroup], [role=tablist], [role=slider], [role=menu], [role=menubar], [role=listbox], [role=grid], [role=tree], [role=toolbar]",
    ) != null
  );
}

/**
 * Moves focus to the next or the previous column link in the column that
 * has focus, or else in the deepest column that has links. False where
 * there is no link to move to.
 */
function moveFocus(view: HTMLElement, target: Element | null, step: 1 | -1) {
  const focused = target?.closest<HTMLElement>("[data-split-view-column]");
  const columns = focused
    ? [focused]
    : [
        ...view.querySelectorAll<HTMLElement>("[data-split-view-column]"),
      ].reverse();
  for (const column of columns) {
    if (!isShown(column)) continue;
    const links = [
      ...column.querySelectorAll<HTMLElement>("[data-split-view-link]"),
    ].filter(isShown);
    if (links.length === 0) continue;
    const current = links.findIndex(
      (link) => target !== null && link.contains(target),
    );
    const next =
      current === -1
        ? step === 1
          ? 0
          : links.length - 1
        : Math.min(links.length - 1, Math.max(0, current + step));
    links[next].focus();
    return true;
  }
  return false;
}

/** The keys of the view. See `NavigationSplitView`. */
function useColumnKeys(
  view: HTMLElement | null,
  deepestBack: SplitViewBackLink | null,
  takeOff: (href: string) => void,
) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (view === null || event.defaultPrevented || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target !== null && target !== document.body && !view.contains(target))
      return;
    if (isTyping(target)) return;
    if (document.querySelector("[aria-modal=true]") !== null) return;
    switch (event.key) {
      case "Escape":
      case "ArrowLeft": {
        if (deepestBack === null) return;
        if (event.key === "ArrowLeft" && ownsArrowKeys(target)) return;
        event.preventDefault();
        takeOff(deepestBack.href);
        return;
      }
      case "ArrowRight": {
        if (
          target instanceof HTMLElement &&
          target.matches("[data-split-view-link]")
        ) {
          event.preventDefault();
          target.click();
        }
        return;
      }
      case "j":
      case "J":
      case "k":
      case "K": {
        const step = event.key.toLowerCase() === "j" ? 1 : -1;
        if (moveFocus(view, target, step)) event.preventDefault();
        return;
      }
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handle(event);
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, []);
}

/**
 * Keeps focus in the view when the deepest column changes. A column that
 * covers the focused element takes focus, and when the detail goes, focus
 * goes back to the element that opened it.
 */
function useStackFocus(
  view: HTMLElement | null,
  column: "content" | "detail",
  key: string | null,
) {
  const shownRef = useRef({ column, key });
  const triggerRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const previous = shownRef.current;
    if (view === null || (previous.column === column && previous.key === key))
      return;
    shownRef.current = { column, key };
    const active =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const isPush = column === "detail" && previous.column !== "detail";
    if (isPush && active !== null && view.contains(active)) {
      triggerRef.current = active;
    }
    if (active !== null && active !== document.body && isShown(active)) {
      return;
    }
    const trigger =
      triggerRef.current === null
        ? null
        : findTwinElement(triggerRef.current, view);
    if (!isPush && trigger !== null && isShown(trigger)) {
      trigger.focus({ preventScroll: true });
      return;
    }
    view
      .querySelector<HTMLElement>(`[data-split-view-column="${column}"]`)
      ?.focus({ preventScroll: true });
  }, [view, column, key]);
}

/** One page of a column, and its part in the motion. */
interface ColumnPage {
  key: string;
  role: "under" | "current" | "leaving";
  column: NavigationSplitViewColumn | NavigationSplitViewDetail;
}

interface ColumnProps {
  column: SplitViewColumnState["column"];
  /** The form of the sidebar, for a sidebar column. */
  form?: "full" | "collapsed";
  /** Whether the page scrolls the column instead of its scroller. */
  pageScrolls: boolean;
  label: string;
  /**
   * The pages of the column, by key: the page that shows, and the pages
   * that a motion still shows. Each page keeps its scroll while it stays.
   */
  pages: readonly ColumnPage[];
  close: (() => void) | null;
  /** Whether the column leaves the view, and shows only while it moves out. */
  isLeaving?: boolean;
  header?: ReactNode;
  /** What a page shows above its node, such as its back link. */
  top?: (column: NavigationSplitViewColumn) => ReactNode;
  css: StyleProp;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
}

function Column({
  column,
  form,
  pageScrolls,
  label,
  pages,
  close,
  isLeaving = false,
  header,
  top,
  css,
  scrollerCss,
  contentCss,
}: ColumnProps) {
  return (
    <section
      aria-label={label}
      tabIndex={-1}
      inert={isLeaving}
      data-split-view-column={column}
      data-split-view-sidebar={form}
      css={[islandSurface.base, styles.column, a11y.focusRingInset, css]}
    >
      {header}
      <div data-split-view-pages="" css={styles.pages}>
        {pages.map((page) => (
          <ColumnPageView
            key={page.key}
            column={column}
            pageScrolls={pageScrolls}
            page={page}
            close={page.role === "current" ? close : null}
            scrollerCss={scrollerCss}
            contentCss={contentCss}
            top={top}
          />
        ))}
      </div>
      {column === "sidebar" ? null : (
        <span data-split-view-edge="" aria-hidden css={styles.edge} />
      )}
    </section>
  );
}

function ColumnPageView({
  column,
  pageScrolls,
  page,
  close,
  scrollerCss,
  contentCss,
  top,
}: {
  column: SplitViewColumnState["column"];
  pageScrolls: boolean;
  page: ColumnPage;
  close: (() => void) | null;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
  top?: (column: NavigationSplitViewColumn) => ReactNode;
}) {
  const [box, setBox] = useState<HTMLElement | null>(null);
  const scroller = pageScrolls ? undefined : box;
  const isCurrent = page.role === "current";
  const accessory = "accessory" in page.column ? page.column.accessory : null;
  return (
    <div
      data-split-view-page={page.role}
      data-split-view-page-key={page.key}
      inert={!isCurrent}
      aria-hidden={isCurrent ? undefined : true}
      css={[styles.page, !isCurrent && styles.pageAside]}
    >
      <SplitViewColumnContext
        value={{ column, presentation: "column", scroller, close }}
      >
        <RegionScroller
          scrollerRef={setBox}
          scrollerCss={scrollerCss}
          contentCss={contentCss}
        >
          {top?.(page.column)}
          {page.column.node}
          {accessory == null ? null : <Accessory>{accessory}</Accessory>}
        </RegionScroller>
      </SplitViewColumnContext>
      <span data-split-view-dim="" aria-hidden css={styles.dim} />
      <span data-split-view-edge="" aria-hidden css={styles.edge} />
    </div>
  );
}

/**
 * The swipe back from the inline-start edge of the content, where the
 * content fills the view, as on a phone. The screen follows the finger, and
 * the swipe goes back where it is let go far enough or fast enough. Else
 * the screen springs back in.
 */
function useEdgeSwipe(
  view: HTMLElement | null,
  motionRef: RefObject<SplitViewMotion | null>,
  pageScrollRef: RefObject<PageScroll | null>,
  back: SplitViewBackLink | null,
  takeOff: (href: string) => void,
) {
  const goBack = useEffectEvent(() => {
    if (back !== null) takeOff(back.href);
  });
  const canSwipe = useEffectEvent(() => back !== null);
  useEffect(() => {
    if (view === null) return;
    let swipe: {
      pointerId: number;
      startX: number;
      startY: number;
      width: number;
      isActive: boolean;
      samples: DragSample[];
    } | null = null;
    const content = () =>
      view.querySelector<HTMLElement>('[data-split-view-column="content"]');
    const onDown = (event: PointerEvent) => {
      if (swipe !== null || !event.isPrimary || event.button !== 0) return;
      if (!canSwipe() || !isStacked(view)) return;
      const column = content();
      if (column === null || !(event.target instanceof Node)) return;
      if (!column.contains(event.target)) return;
      const box = column.getBoundingClientRect();
      if (event.clientX - box.left > EDGE_SWIPE_ZONE) return;
      swipe = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: box.width,
        isActive: false,
        samples: [],
      };
    };
    const onMove = (event: PointerEvent) => {
      if (swipe === null || event.pointerId !== swipe.pointerId) return;
      const dx = event.clientX - swipe.startX;
      if (!swipe.isActive) {
        const decision = claimEdgeSwipe(dx, event.clientY - swipe.startY);
        if (decision === "wait") return;
        pageScrollRef.current?.align();
        if (
          decision === "release" ||
          motionRef.current?.beginSwipe() !== true
        ) {
          swipe = null;
          return;
        }
        swipe.isActive = true;
        try {
          view.setPointerCapture(event.pointerId);
        } catch {
          // A pointer that is gone cannot be captured, and the swipe goes on.
        }
      }
      swipe.samples.push({ time: performance.now(), y: event.clientX });
      if (swipe.samples.length > 12) swipe.samples.shift();
      motionRef.current?.drag(1 - Math.min(1, Math.max(0, dx / swipe.width)));
    };
    const onUp = (event: PointerEvent, canPop: boolean) => {
      if (swipe === null || event.pointerId !== swipe.pointerId) return;
      const ended = swipe;
      swipe = null;
      if (!ended.isActive) return;
      const velocity = releaseVelocity(ended.samples, performance.now());
      const pop =
        canPop &&
        shouldPop(event.clientX - ended.startX, velocity, ended.width);
      motionRef.current?.release(pop, (-velocity * 1000) / ended.width);
      swipedAt = performance.now();
      if (pop) goBack();
    };
    // The click that ends a swipe must not follow the link under it.
    let swipedAt = Number.NEGATIVE_INFINITY;
    const onClick = (event: Event) => {
      if (performance.now() - swipedAt > 300) return;
      swipedAt = Number.NEGATIVE_INFINITY;
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerUp = (event: PointerEvent) => {
      onUp(event, true);
    };
    const onCancel = (event: PointerEvent) => {
      onUp(event, false);
    };
    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onPointerUp);
    view.addEventListener("pointercancel", onCancel);
    view.addEventListener("click", onClick, { capture: true });
    return () => {
      view.removeEventListener("click", onClick, { capture: true });
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onPointerUp);
      view.removeEventListener("pointercancel", onCancel);
    };
  }, [view, motionRef, pageScrollRef]);
}

/** Whether the content fills the view, as on a phone. */
function isStacked(view: HTMLElement) {
  const rem =
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
    16;
  return view.getBoundingClientRect().width / rem < 30;
}

function RegionScroller({
  scrollerRef,
  scrollerCss,
  contentCss,
  children,
}: {
  scrollerRef: RefCallback<HTMLElement>;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
  children: ReactNode;
}) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div
      ref={mergeRefs<HTMLDivElement>(scroller, scrollerRef)}
      css={[styles.scroller, a11y.focusRingInset, scrollerCss]}
    >
      <div ref={content} css={[styles.content, contentCss]}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </div>
  );
}

function Accessory({ children }: { children: ReactNode }) {
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div ref={ref} css={[styles.accessory, css]}>
      <EffectCarrier value={sticky}>
        <div css={styles.accessoryControl}>{children}</div>
      </EffectCarrier>
    </div>
  );
}

function BackLink({
  back,
  onTakeOff,
}: {
  back: SplitViewBackLink;
  onTakeOff: (href: string) => void;
}) {
  const view = use(SplitViewContext);
  const LinkComponent = view?.linkComponent ?? PlainAnchor;
  return (
    <div css={styles.back}>
      <LinkComponent
        href={back.href}
        onClick={(event) => {
          if (event.defaultPrevented || !isPlainClick(event)) return;
          event.preventDefault();
          onTakeOff(back.href);
        }}
        {...stylex.props(
          typeRole.label,
          a11y.touchTarget,
          a11y.focusRing,
          corner.radius_1,
          styles.backLink,
        )}
      >
        <CaretLeftIcon weight="bold" aria-hidden />
        {back.label}
      </LinkComponent>
    </div>
  );
}

function DetailHeader({
  back,
  label,
  closeLabel,
  onClose,
}: {
  back: SplitViewBackLink;
  label: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div css={styles.detailHeader}>
      <p css={[typeRole.label, styles.breadcrumb]}>
        <span css={truncate.base}>{back.label}</span>
        <CaretRightIcon weight="bold" aria-hidden />
        <span css={styles.breadcrumbCurrent}>{label}</span>
      </p>
      <Button
        look="ghost"
        size="sm"
        icon={<XIcon weight="bold" />}
        aria-label={closeLabel}
        onClick={onClose}
        css={styles.close}
      />
    </div>
  );
}

const CONTENT_GUTTER_START = `max(${space._4}, env(safe-area-inset-left))`;
const CONTENT_GUTTER_END = `max(${space._4}, env(safe-area-inset-right))`;
/** The view keeps the islands clear of the status bar, except where the content fills it. */
const CONTENT_PADDING_BLOCK_START = `calc(${space._4} + max(0px, env(safe-area-inset-top) - ${islandTokens.insetBlockStart}))`;
const CONTENT_PADDING_BLOCK_END = `calc(${space._6} + ${splitViewTokens.columnInsetBlockEnd})`;
/** Above the tab bar below `md`, and above the safe area from `md` up. */
const ACCESSORY_INSET_BLOCK_END = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const styles = stylex.create({
  // The view fills the screen and the page does not scroll, except inside a
  // `TabView` narrower than 30rem. Inside a `TabView` below `md`, the view
  // goes under the floating tab bar, and each column keeps its content above
  // the bar.
  view: {
    position: "relative",
    containerType: "inline-size",
    blockSize: { default: "100dvh", [splitViewQueries.pageScrolls]: "auto" },
    maxBlockSize: { default: "100%", [splitViewQueries.pageScrolls]: "none" },
  },
  // The copies of the Shared elements fly over the columns.
  flights: {
    position: "absolute",
    inset: 0,
    zIndex: layer.raised,
    overflow: "clip",
    pointerEvents: "none",
  },
  // Each column is an island on the canvas. Where the content fills the
  // view, as on a phone, the islands have no gaps and no corners.
  columns: {
    [islandTokens.radius]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetBlockStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetBlockEnd]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetInlineStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetInlineEnd]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    // The part of the bar or of the safe area that the gap under the
    // islands does not already clear.
    [splitViewTokens.columnInsetBlockEnd]: `max(0px, max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom)) - ${islandTokens.insetBlockEnd})`,
    position: "relative",
    blockSize: { default: "100%", [splitViewQueries.pageScrolls]: "auto" },
    overflow: "clip",
  },
  fullSidebarBesideContent: {
    [splitViewDisplay.noFullSidebar]: {
      default: null,
      [splitViewQueries.contentBesideSidebar]: "none",
    },
  },
  column: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  // The pages of a column lie on top of each other, and a motion moves
  // them inside the column.
  pages: {
    position: "relative",
    flexGrow: 1,
    minBlockSize: 0,
    overflow: "clip",
  },
  // Where the page scrolls, the page that shows is in the flow.
  page: {
    position: {
      default: "absolute",
      [splitViewQueries.pageScrolls]: "relative",
    },
    inset: 0,
    display: "flex",
    flexDirection: "column",
    isolation: "isolate",
  },
  // A page under the one that shows, or one that leaves, keeps its scroll
  // and shows only while a motion moves it. Where the page scrolls, it is as
  // tall as its content, and `createPageScroll` moves it to show its scroll.
  pageAside: {
    position: "absolute",
    insetBlockEnd: { default: null, [splitViewQueries.pageScrolls]: "auto" },
    visibility: "hidden",
    contentVisibility: "hidden",
  },
  dim: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
    backgroundColor: color.bgScrim,
    opacity: 0,
    pointerEvents: "none",
  },
  // The shadow at the inline-start edge of a page or a column while it
  // moves in over the one under it.
  edge: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
    boxShadow: shadow._5,
    clipPath: "inset(-100% 0 -100% -100%)",
    opacity: 0,
    pointerEvents: "none",
  },
  scroller: {
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: { default: "auto", [splitViewQueries.pageScrolls]: "visible" },
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minBlockSize: { default: "100%", [splitViewQueries.pageScrolls]: "100dvh" },
    paddingBlockStart: CONTENT_PADDING_BLOCK_START,
    paddingBlockEnd: CONTENT_PADDING_BLOCK_END,
  },
  stackedOnly: {
    display: splitViewDisplay.stacked,
  },
  unlessStacked: {
    display: splitViewDisplay.unstacked,
  },
  unlessFullSidebar: {
    display: splitViewDisplay.noFullSidebar,
  },
  back: {
    display: "flex",
    marginBlockEnd: rhythm.tight,
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
    color: color.fgMuted,
    textDecoration: "none",
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    paddingBlockStart: CONTENT_PADDING_BLOCK_START,
    paddingInlineStart: CONTENT_GUTTER_START,
    paddingInlineEnd: `max(${space._2}, env(safe-area-inset-right))`,
  },
  // The close button overhangs the line of the breadcrumb, so that the
  // breadcrumb sits on the line of the content's back link, and the detail's
  // first line on the line of the content's title.
  close: {
    marginBlock: `calc((1lh - ${controlHeight.sm}) / 2)`,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    minInlineSize: 0,
    margin: 0,
    color: color.fgMuted,
  },
  breadcrumbCurrent: {
    flexShrink: 0,
  },
  // The accessory sticks to the bottom of the scroller, or of the screen
  // where the page scrolls. At the end of the content, its place in the flow
  // is the room the column keeps for it, and the negative margin puts that
  // place where the accessory sticks.
  accessory: {
    position: "sticky",
    insetBlockEnd: ACCESSORY_INSET_BLOCK_END,
    zIndex: layer.raised,
    display: "flex",
    justifyContent: "flex-end",
    marginBlockStart: "auto",
    marginBlockEnd: `calc(${ACCESSORY_INSET_BLOCK_END} - ${CONTENT_PADDING_BLOCK_END})`,
    paddingBlockStart: rhythm.item,
    pointerEvents: "none",
  },
  accessoryControl: {
    pointerEvents: "auto",
  },
});

// A hidden column leaves the flow but keeps its box, its width and its
// scroll, so that it shows again as it was.
const sidebarStyles = stylex.create({
  base: {
    flexShrink: 0,
  },
  full: {
    inlineSize: splitViewWidths.sidebar,
  },
  collapsed: {
    inlineSize: splitViewWidths.collapsedSidebar,
  },
  fullContent: {
    paddingInline: space._3,
  },
  collapsedContent: {
    paddingInline: space._1,
  },
  hidden: {
    position: "absolute",
    insetBlockStart: islandTokens.insetBlockStart,
    insetBlockEnd: islandTokens.insetBlockEnd,
    insetInlineStart: islandTokens.insetInlineStart,
    visibility: "hidden",
  },
  collapsedBesideDetail: {
    position: "relative",
    visibility: "visible",
  },
  fullBesideContent: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideSidebar]: "relative",
    },
    insetBlockStart: {
      default: islandTokens.insetBlockStart,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetBlockEnd: {
      default: islandTokens.insetBlockEnd,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetInlineStart: {
      default: islandTokens.insetInlineStart,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
  },
  collapsedBesideContent: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideCollapsed]: "relative",
    },
    insetBlockStart: {
      default: islandTokens.insetBlockStart,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    insetBlockEnd: {
      default: islandTokens.insetBlockEnd,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    insetInlineStart: {
      default: islandTokens.insetInlineStart,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideCollapsed]: "visible",
    },
  },
});

// A custom property set in a container query goes into a cascade layer,
// and one set without a condition does not. Thus a column sets a display
// of `splitViewDisplay` only in a container query, and the default comes
// from the root.
const contentStyles = stylex.create({
  base: {
    position: "relative",
    flexGrow: 1,
    flexBasis: 0,
    inlineSize: "100%",
  },
  stackedBelowCollapsed: {
    [splitViewDisplay.stacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "contents",
    },
    [splitViewDisplay.unstacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "none",
    },
  },
  stackedBelowSidebar: {
    [splitViewDisplay.stacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "contents",
      [splitViewQueries.contentBesideCollapsed]: "contents",
    },
    [splitViewDisplay.unstacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "none",
      [splitViewQueries.contentBesideCollapsed]: "none",
    },
  },
  content: {
    paddingInlineStart: {
      default: CONTENT_GUTTER_START,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
    },
    paddingInlineEnd: {
      default: CONTENT_GUTTER_END,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
    },
  },
  // A swipe from the inline-start edge goes back, so the browser takes only
  // the scroll and the zoom of a touch.
  swipes: {
    touchAction: {
      default: null,
      [splitViewQueries.contentAlone]: "pan-y pinch-zoom",
    },
  },
});

const detailStyles = stylex.create({
  // Below `detailBeside`, the view shows the detail in a sheet. The column
  // shows there only for the first frame, before the view measures itself,
  // and it then stays out of the way.
  base: {
    display: { default: "none", [splitViewQueries.detailBeside]: "flex" },
    position: "relative",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: splitViewWidths.detail,
  },
  // The header above the scroller keeps clear of the safe area.
  content: {
    paddingBlockStart: rhythm.tight,
  },
  // The detail that goes leaves the flow at once, so the content takes its
  // width, and it shows only while it moves out.
  leaving: {
    position: "absolute",
    insetBlockStart: islandTokens.insetBlockStart,
    insetBlockEnd: islandTokens.insetBlockEnd,
    insetInlineStart: "auto",
    insetInlineEnd: islandTokens.insetInlineEnd,
    inlineSize: splitViewWidths.detail,
    visibility: "hidden",
    // Over the content, which takes a fill while it moves.
    zIndex: 2,
  },
});

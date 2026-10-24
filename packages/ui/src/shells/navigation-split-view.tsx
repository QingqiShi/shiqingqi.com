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
  ViewTransition,
  type ComponentProps,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  type RefCallback,
} from "react";
import { Button } from "../actions/button.tsx";
import { PlainAnchor } from "../actions/tab-bar.tsx";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { findTwinElement } from "../focus/find-twin-element.ts";
import { isRendered } from "../focus/is-rendered.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { Sheet } from "../surfaces/sheet.tsx";
import {
  border,
  color,
  controlHeight,
  layer,
  rhythm,
  space,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  splitViewDisplay,
  splitViewQueries,
  splitViewWidths,
} from "./navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "./navigation-split-view.stylex.ts";
import { tabViewTokens } from "./tab-view.stylex.ts";

/**
 * The narrowest view, in rem, where the detail shows beside the content:
 * the collapsed sidebar, 20rem of content and the detail. It is the same
 * width as `splitViewQueries.detailBeside`.
 */
const DETAIL_BESIDE_MIN_REM = 48.75;

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
   * The box that scrolls the column, `null` until it mounts and in a sheet.
   * Give it to a virtual list as its scroll parent.
   */
  scroller: HTMLElement | null;
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
 * A link in a column that opens or changes the column after it, such as a
 * row of a list. It renders the view's `linkComponent` and follows the
 * history rule of the view. J and K move focus between the column links of
 * one column. Pass it as the link component of a row, such as `ListRow`'s.
 */
export function SplitViewLink({ onClick, ...props }: SplitViewLinkProps) {
  const view = use(SplitViewContext);
  const column = use(SplitViewColumnContext);
  const LinkComponent = view?.linkComponent ?? PlainAnchor;
  return (
    <LinkComponent
      {...props}
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
  const detailBeside = useDetailBeside(view);
  const hasSidebar = sidebar != null;
  const hasCollapsed = hasSidebar && collapsedSidebar != null;
  const asSheet = detail != null && detailBeside === false;
  const detailColumn = asSheet ? null : (detail ?? null);
  const hasDetailColumn = detailColumn !== null;
  const deepest = detail ?? content;
  const deepestBack = deepest.back ?? null;

  const leavingRef = useRef<string | null>(null);
  const pushedRef = useRef<{ from: string; to: string } | null>(null);
  useLayoutEffect(() => {
    leavingRef.current = null;
  }, [deepest.key, deepestBack?.href]);

  const takeOff = (href: string) => {
    if (leavingRef.current === window.location.href) return;
    leavingRef.current = window.location.href;
    if (previousEntryUrl(pushedRef.current) === normalizeUrl(href)) {
      window.history.back();
    } else {
      replace(href);
    }
  };

  const follow: SplitViewState["follow"] = (event, href, column) => {
    if (event.defaultPrevented || !isPlainClick(event)) return;
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

  const [lastSheet, setLastSheet] = useState<NavigationSplitViewDetail | null>(
    null,
  );
  if (asSheet && (lastSheet === null || lastSheet.key !== detail.key)) {
    setLastSheet(detail);
  }
  const sheet = asSheet ? detail : lastSheet;

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

  return (
    <SplitViewContext value={viewState}>
      <div ref={setView} css={[styles.view, css]}>
        <div
          css={[
            styles.columns,
            hasSidebar && !hasDetailColumn && styles.fullSidebarBesideContent,
          ]}
        >
          {hasSidebar
            ? sidebarForms.map((form) => (
                <Column
                  key={form}
                  column="sidebar"
                  label={sidebar.label}
                  columnKey={sidebar.key}
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
                >
                  {form === "full" ? sidebar.node : collapsedSidebar}
                </Column>
              ))
            : null}
          <Column
            column="content"
            label={content.label}
            columnKey={content.key}
            close={closeOf(content.back)}
            accessory={content.accessory}
            css={[
              contentStyles.base,
              !hasDetailColumn &&
                (hasCollapsed
                  ? contentStyles.stackedBelowCollapsed
                  : hasSidebar && contentStyles.stackedBelowSidebar),
            ]}
            contentCss={contentStyles.content}
          >
            {content.back == null ? null : (
              <BackLink back={content.back} onTakeOff={takeOff} />
            )}
            {content.node}
          </Column>
          {detailColumn === null ? null : (
            <Column
              column="detail"
              label={detailColumn.label}
              columnKey={detailColumn.key}
              close={closeOf(detailColumn.back)}
              header={
                <DetailHeader
                  back={detailColumn.back}
                  label={detailColumn.label}
                  closeLabel={closeLabel}
                  onClose={() => {
                    takeOff(detailColumn.back.href);
                  }}
                />
              }
              css={detailStyles.base}
              contentCss={[contentStyles.content, detailStyles.content]}
              fades
            >
              {detailColumn.node}
            </Column>
          )}
        </div>
      </div>
      <Sheet
        isOpen={asSheet}
        onClose={() => {
          if (sheet !== null) takeOff(sheet.back.href);
        }}
        closeLabel={closeLabel}
        aria-label={sheet?.label ?? closeLabel}
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
    </SplitViewContext>
  );
}

function replaceLocation(href: string) {
  window.location.replace(href);
}

/** Whether a click opens the link in place, with no key and no other button. */
function isPlainClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/** The URL without its fragment and with its params in order, to compare two URLs. */
function normalizeUrl(href: string) {
  const url = new URL(href, window.location.href);
  url.hash = "";
  url.searchParams.sort();
  return url.href;
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

interface ColumnProps {
  column: SplitViewColumnState["column"];
  label: string;
  columnKey: string | null | undefined;
  close: (() => void) | null;
  header?: ReactNode;
  accessory?: ReactNode;
  css: StyleProp;
  contentCss: StyleProp;
  /** Fades the old content out and the new content in when the key changes. */
  fades?: boolean;
  children: ReactNode;
}

function Column({
  column,
  label,
  columnKey,
  close,
  header,
  accessory,
  css,
  contentCss,
  fades = false,
  children,
}: ColumnProps) {
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const key = columnKey ?? undefined;
  const body = (
    <>
      {children}
      {accessory == null ? null : <Accessory>{accessory}</Accessory>}
    </>
  );
  return (
    <section
      aria-label={label}
      tabIndex={-1}
      data-split-view-column={column}
      css={[styles.column, a11y.focusRingInset, css]}
    >
      <SplitViewColumnContext
        value={{ column, presentation: "column", scroller, close }}
      >
        {header}
        {fades ? (
          // The browser draws the snapshot of a view transition above the
          // page. Thus the snapshot is of the scroller, which clips its own
          // content, and not of the content.
          <ViewTransition key={key} enter="auto" exit="auto" default="none">
            <RegionScroller scrollerRef={setScroller} contentCss={contentCss}>
              {body}
            </RegionScroller>
          </ViewTransition>
        ) : (
          <RegionScroller
            key={key}
            scrollerRef={setScroller}
            contentCss={contentCss}
          >
            {body}
          </RegionScroller>
        )}
      </SplitViewColumnContext>
    </section>
  );
}

function RegionScroller({
  scrollerRef,
  contentCss,
  children,
}: {
  scrollerRef: RefCallback<HTMLElement>;
  contentCss: StyleProp;
  children: ReactNode;
}) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div
      ref={mergeRefs<HTMLDivElement>(scroller, scrollerRef)}
      css={[styles.scroller, a11y.focusRingInset]}
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
const CONTENT_PADDING_BLOCK_END = `calc(${space._6} + ${splitViewTokens.columnInsetBlockEnd})`;
/** Above the tab bar below `md`, and above the safe area from `md` up. */
const ACCESSORY_INSET_BLOCK_END = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const styles = stylex.create({
  // The view fills the screen and the page does not scroll. Inside a
  // `TabView` below `md`, the view goes under the floating tab bar, and
  // each column keeps its content above the bar.
  view: {
    [splitViewTokens.columnInsetBlockEnd]: `max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom))`,
    containerType: "inline-size",
    blockSize: "100dvh",
    maxBlockSize: "100%",
  },
  columns: {
    position: "relative",
    display: "flex",
    blockSize: "100%",
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
    insetBlock: 0,
    insetInlineStart: 0,
    minInlineSize: 0,
    blockSize: "100%",
  },
  scroller: {
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minBlockSize: "100%",
    paddingBlockStart: `calc(${space._4} + env(safe-area-inset-top))`,
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
    paddingBlockStart: `calc(${space._4} + env(safe-area-inset-top))`,
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
  // The accessory sticks to the bottom of the scroller. At the end of the
  // content, its place in the flow is the room the column keeps for it, and
  // the negative margin puts that place where the accessory sticks.
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
    borderInlineEndWidth: border.size_1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.border,
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
    paddingInlineStart: CONTENT_GUTTER_START,
    paddingInlineEnd: CONTENT_GUTTER_END,
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
    borderInlineStartWidth: border.size_1,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.border,
  },
  // The header above the scroller keeps clear of the safe area.
  content: {
    paddingBlockStart: rhythm.tight,
  },
});

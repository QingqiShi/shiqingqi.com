import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import {
  createMotionValue,
  type MotionValue,
} from "../motion/create-motion-value.ts";
import {
  aspect,
  CONTAIN_ASPECT,
  copyForMotion,
  mixRect,
  opaqueFillOf,
  readSharedForm,
  type SharedForm,
} from "../motion/fly-shared.ts";
import { mix, smoothstep } from "../motion/mix.ts";
import { rectIn, type Rect } from "../motion/play-layout.ts";
import { px, UNCLIPPED, writeStyles, type Styles } from "../motion/px.ts";
import { springRoles } from "../motion/spring-roles.ts";
import { isShown } from "./split-view-motion/is-view-stacked.ts";
import {
  CROSS_FADE,
  springValue,
  unbindAll,
} from "./split-view-motion/show.ts";
import { tabViewForm } from "./tab-view.stylex.ts";

/** The data attributes that tell the motion which element is which. */
const FOLD = {
  /** What shows in the sidebar and in the rail, by its name in both. */
  part: "data-tab-view-part",
  /** A box whose children are lines that show in both, by their order. */
  slot: "data-tab-view-slot",
  /** The button that collapses the sidebar. */
  toggle: "toggle",
} as const;

/** The sidebar of a screen with a list, which holds the destinations above that list. */
const LIST_SIDEBAR = "[data-split-view-nav]";

/** How near its end, in px, the sidebar shows at rest. */
const REST_PX = 0.5;
/** How slow, in px in a second, the sidebar shows at rest. */
const REST_SPEED = 10;

/** The custom properties that give the rail its form. */
const FORM_VARS = [
  tabViewForm.icons,
  tabViewForm.labels,
  tabViewForm.railDisplay,
  tabViewForm.toggleDisplay,
  tabViewForm.topColumns,
  tabViewForm.toggleRow,
  tabViewForm.inlineSize,
  tabViewForm.paddingInline,
  tabViewForm.slotJustify,
].flatMap((value) => {
  const name = /^var\((--[^)]+)\)$/.exec(value)?.[1];
  return name === undefined ? [] : [name];
});

type FormName = "rail" | "sidebar";

/** One form of the sidebar as the screen shows it: the rail of icons, or the labelled sidebar. */
interface ShownForm {
  readonly name: FormName;
  /** The element that shows the form now. */
  readonly container: HTMLElement;
  /** The values of the custom properties that give the form, for a copy out of its place. */
  readonly vars: Styles;
  /** The box of the container, in px from the layer. */
  readonly rect: Rect;
  /** How far each element of the container had scrolled, by its order in the container. */
  readonly scrolls: readonly (readonly [number, number])[];
  readonly parts: ReadonlyMap<
    string,
    { readonly real: HTMLElement; readonly form: SharedForm }
  >;
}

/** A form that leaves, with what the copy of it takes. */
interface LeavingForm extends ShownForm {
  /** A copy of the container as it showed. */
  readonly box: SharedForm;
  /** The fill behind the container. */
  readonly fill: string;
}

/**
 * The motion of the sidebar of a `TabView` that the visitor collapses to the
 * rail of icons, or expands. One value moves all of it, so a press in the
 * middle of the motion turns each part from where it is: the value that
 * moves the content of a `NavigationSplitView` in the content, and else a
 * value of its own on the `fold` spring.
 * What shows in both forms flies from its place in one to its place in the
 * other, as a copy. The rest of the form that leaves fades out, as a copy,
 * and the rest of the form that comes fades in. The labelled sidebar shows
 * only as far as the inline start of the content.
 *
 * @internal
 */
export interface SidebarFold {
  /** Reads the form that shows now. Call it before the press changes the DOM. */
  capture(to: "in" | "out"): void;
  /** Plays the change from the form of `capture` to the form in the DOM now. */
  play(to: "in" | "out"): void;
  /** How far, in px, the content showed from its place of now at the last `capture`. */
  contentShift(): number;
  /**
   * Takes `slide`, the value that moves the content of `view`, a view in the
   * content, for the press that plays next: how far, in px, that content is
   * from its place. The motion then follows that value, so that the sidebar
   * keeps to the inline start of the content.
   */
  follow(view: HTMLElement, slide: MotionValue | null): void;
  destroy(): void;
}

function isLaidOut(element: Element) {
  const { width, height } = element.getBoundingClientRect();
  return width > 0 && height > 0;
}

/**
 * Whether the screen shows `element`: nothing covers its middle, such as the
 * top of a sidebar that its list scrolls under, and it is on the screen.
 */
function isInView(element: HTMLElement) {
  const { left, top, width, height } = element.getBoundingClientRect();
  const hit = document.elementFromPoint(left + width / 2, top + height / 2);
  return hit !== null && (element.contains(hit) || hit.contains(element));
}

/**
 * What shows in both forms, by name: each named part, and `withLines`, each
 * line of a slot that holds no named part.
 */
function partsIn(container: Element, withLines: boolean) {
  const found = new Map<string, HTMLElement>();
  for (const part of container.querySelectorAll<HTMLElement>(
    `[${FOLD.part}]`,
  )) {
    const name = part.getAttribute(FOLD.part);
    if (name !== null && isLaidOut(part)) found.set(name, part);
  }
  if (!withLines) return found;
  for (const slot of container.querySelectorAll(`[${FOLD.slot}]`)) {
    const name = slot.getAttribute(FOLD.slot) ?? "";
    [...slot.children].forEach((line, index) => {
      if (
        line instanceof HTMLElement &&
        !line.hasAttribute(FOLD.part) &&
        line.querySelector(`[${FOLD.part}]`) === null &&
        isLaidOut(line)
      ) {
        found.set(`${name}:${String(index)}`, line);
      }
    });
  }
  return found;
}

/** The form of `element` now, with a copy of it that stays as it is. */
function copyOf(element: HTMLElement, origin: DOMRect): SharedForm {
  const copy = element.cloneNode(true);
  if (!(copy instanceof HTMLElement)) throw new TypeError("No copy");
  return { ...readSharedForm(element, rectIn(element, origin)), element: copy };
}

/**
 * The poses of the two copies of a part while it flies between `rail` and
 * `sidebar`, at 0 and at 1. Copies of a like shape stretch with the box and
 * cross-fade. Copies of unlike shapes keep the shape of their content, in
 * the middle of the box, and cross-fade too.
 */
function flightPoses(rail: Rect, sidebar: Rect) {
  const ratio = aspect(rail) / aspect(sidebar);
  const contain = Math.max(ratio, 1 / ratio) > CONTAIN_ASPECT;
  const shown = (open: number): readonly [number, number] => [
    1 - smoothstep(0.2, 0.8, open),
    smoothstep(0.2, 0.8, open),
  ];
  const poseOf = (rest: Rect, end: 0 | 1) => (open: number) => {
    const box = mixRect(rail, sidebar, open);
    const wide = box.width / Math.max(rest.width, 1);
    const tall = box.height / Math.max(rest.height, 1);
    const scale = Math.min(wide, tall);
    const x = contain ? box.x + (box.width - rest.width * scale) / 2 : box.x;
    const y = contain ? box.y + (box.height - rest.height * scale) / 2 : box.y;
    return {
      transform: `translate(${px(x - rest.x)}, ${px(y - rest.y)}) scale(${(contain ? scale : wide).toFixed(4)}, ${(contain ? scale : tall).toFixed(4)})`,
      opacity: shown(open)[end].toFixed(3),
    };
  };
  return [poseOf(rail, 0), poseOf(sidebar, 1)] as const;
}

/** What moves the motion, and how far open the sidebar is at a value of it. */
interface Driver {
  readonly value: MotionValue;
  readonly openAt: (value: number) => number;
  /** Stops the watch for the end of the motion. */
  readonly unwatch: () => void;
}

/** A motion that plays: the copies that fly, from the first press to the rest. */
interface Run {
  /** Where the inline end of each form is, in px from the layer. */
  readonly edges: Readonly<Record<FormName, number>>;
  /** The names of the parts that fly. */
  readonly keys: ReadonlySet<string>;
  readonly flights: readonly {
    readonly copy: HTMLElement;
    readonly pose: (open: number) => Styles;
  }[];
  /** The parts in the page that wait out of sight while their copies fly. */
  readonly waiting: Set<HTMLElement>;
}

/** What each press of a run replaces. */
interface Shown {
  readonly driver: Driver;
  readonly bindings: readonly Binding[];
  /** The copy of the form that leaves. */
  readonly copy: HTMLElement;
}

/** @internal */
export function createSidebarFold(
  engine: MotionEngine,
  {
    root,
    rail,
    content,
    layer,
    under,
  }: {
    /** The box of the view, which holds the rail and the content. */
    root: HTMLElement;
    rail: HTMLElement;
    content: HTMLElement;
    /** Where the copies that fly show, over the rail and the content. */
    layer: HTMLElement;
    /**
     * Where the copy of the form that leaves shows: a box as large as
     * `layer`, under the content, so that the content covers the copy.
     */
    under: HTMLElement;
  },
): SidebarFold {
  /** 0 at the rail of icons, and 1 at the labelled sidebar. */
  const open = springValue(engine, 1, springRoles.fold);
  let captured: LeavingForm | null = null;
  let hadFocus = false;
  let contentLeft: number | null = null;
  let run: Run | null = null;
  let shown: Shown | null = null;
  let fade: Binding | null = null;
  /**
   * The views in the content that move their content for the press that
   * plays next, each with the value that moves it.
   */
  let followers: { view: HTMLElement; slide: MotionValue | null }[] = [];

  function readForm(name: FormName): ShownForm | null {
    const container =
      name === "rail" || isLaidOut(rail)
        ? rail
        : content.querySelector<HTMLElement>(LIST_SIDEBAR);
    if (container === null || !isLaidOut(container)) return null;
    const origin = layer.getBoundingClientRect();
    const style = getComputedStyle(container);
    const scrolls = [...container.querySelectorAll("*")].flatMap(
      (element, index) =>
        element.scrollTop > 0 ? [[index, element.scrollTop] as const] : [],
    );
    const parts = new Map<string, { real: HTMLElement; form: SharedForm }>();
    // A line can cover what a list scrolled under it, so it stays in its
    // form then.
    for (const [key, real] of partsIn(container, scrolls.length === 0)) {
      if (isInView(real)) {
        parts.set(key, { real, form: copyOf(real, origin) });
      }
    }
    return {
      name,
      container,
      vars: Object.fromEntries(
        FORM_VARS.map((property) => [
          property,
          style.getPropertyValue(property),
        ]),
      ),
      rect: rectIn(container, origin),
      scrolls,
      parts,
    };
  }

  function readLeaving(name: FormName): LeavingForm | null {
    const form = readForm(name);
    if (form === null) return null;
    const { container } = form;
    return {
      ...form,
      box: copyOf(container, layer.getBoundingClientRect()),
      fill: opaqueFillOf(container),
    };
  }

  /** A copy of `form` in `box`, with the custom properties of its form. */
  function copyIn(form: SharedForm, vars: Styles, box = layer) {
    const copy = copyForMotion(form, box);
    writeStyles(copy, vars);
    for (const node of copy.querySelectorAll("[id]"))
      node.removeAttribute("id");
    return copy;
  }

  function edgeAt(edges: Run["edges"], at: number) {
    return mix(edges.rail, edges.sidebar, at);
  }

  /**
   * The pose of a form, on its container or on a copy of it at `rect`. The
   * labelled sidebar shows as far as the inline start of the content.
   */
  function formPose(name: FormName, rect: Rect, edges: Run["edges"]) {
    if (name === "rail") {
      return (at: number) => ({
        opacity: (1 - smoothstep(0.1, 0.6, at)).toFixed(3),
      });
    }
    return (at: number) => ({
      opacity: smoothstep(0.3, 0.9, at).toFixed(3),
      "clip-path": `inset(${UNCLIPPED} ${px(Math.max(0, rect.x + rect.width - edgeAt(edges, at)))} ${UNCLIPPED} ${UNCLIPPED})`,
    });
  }

  function startRun(rail: ShownForm, sidebar: ShownForm): Run {
    const keys = new Set<string>();
    const flights: { copy: HTMLElement; pose: (open: number) => Styles }[] = [];
    for (const [key, from] of rail.parts) {
      const to = sidebar.parts.get(key);
      if (to === undefined) continue;
      keys.add(key);
      const poses = flightPoses(from.form.rect, to.form.rect);
      flights.push(
        { copy: copyIn(from.form, rail.vars), pose: poses[0] },
        { copy: copyIn(to.form, sidebar.vars), pose: poses[1] },
      );
    }
    const endOf = ({ rect }: ShownForm) => rect.x + rect.width;
    return {
      edges: { rail: endOf(rail), sidebar: endOf(sidebar) },
      keys,
      flights,
      waiting: new Set(),
    };
  }

  function letGo() {
    if (shown === null) return;
    shown.driver.unwatch();
    unbindAll(shown.bindings);
    shown.copy.remove();
    shown = null;
  }

  /**
   * Shows `showing` on its container in the page, `leaving` as a copy, and
   * the copies that fly, all at the value of `driver`. A view in the content
   * moves its own content. With `movesContent`, no view does, and the content
   * moves as one box.
   */
  function show(
    playing: Run,
    leaving: LeavingForm,
    showing: ShownForm,
    driver: Driver,
    movesContent: boolean,
  ) {
    letGo();
    for (const key of playing.keys) {
      const part = showing.parts.get(key)?.real;
      if (part === undefined) continue;
      part.style.setProperty("opacity", "0");
      playing.waiting.add(part);
    }
    const copy = copyIn(leaving.box, leaving.vars, under);
    // A box that fades blurs only what it holds, and Chromium blurs less
    // where that has no fill: a list under the top of the sidebar shows
    // sharp. The copy takes the fill that was behind the form.
    writeStyles(copy, { "background-color": leaving.fill });
    const copied = copy.firstElementChild;
    if (copied instanceof HTMLElement) {
      writeStyles(copied, { "clip-path": "none" });
      const all = [...copied.querySelectorAll("*")];
      for (const [index, top] of leaving.scrolls) {
        const scroller = all.at(index);
        if (scroller !== undefined) scroller.scrollTop = top;
      }
      for (const [key, part] of partsIn(copied, true)) {
        if (playing.keys.has(key)) part.style.setProperty("opacity", "0");
      }
    }
    const { edges } = playing;
    const { value, openAt } = driver;
    const shows = (
      element: HTMLElement,
      pose: (open: number) => Styles,
    ): Binding => bind(element, value, { pose: (at) => pose(openAt(at)) });
    const bindings = [
      ...playing.flights.map((flight) => shows(flight.copy, flight.pose)),
      shows(copy, formPose(leaving.name, leaving.rect, edges)),
      shows(showing.container, formPose(showing.name, showing.rect, edges)),
    ];
    if (movesContent) {
      const place = edges[showing.name];
      bindings.push(
        shows(content, (at) => ({
          translate: `${px(edgeAt(edges, at) - place)} 0px`,
        })),
        // The content can show past the inline end of the view on its way.
        shows(root, () => ({ "overflow-x": "clip" })),
      );
    }
    shown = { driver, bindings, copy };
  }

  function stop() {
    fade?.unbind();
    fade = null;
    if (run === null) return;
    const playing = run;
    run = null;
    letGo();
    for (const { copy } of playing.flights) copy.remove();
    for (const part of playing.waiting) part.style.removeProperty("opacity");
    open.stop();
  }

  /** The button that the visitor pressed can leave with its form. The button of the other form takes the focus. */
  function keepFocus() {
    if (!hadFocus) return;
    hadFocus = false;
    const active = document.activeElement;
    if (active !== null && active !== document.body && isLaidOut(active)) {
      return;
    }
    // Not in the whole view: a copy also holds a button.
    for (const box of [rail, content]) {
      for (const button of box.querySelectorAll<HTMLElement>(
        `[${FOLD.part}="${FOLD.toggle}"] button`,
      )) {
        if (isLaidOut(button)) {
          button.focus({ preventScroll: true });
          return;
        }
      }
    }
  }

  return {
    capture(to) {
      const active = document.activeElement;
      hadFocus =
        active !== null &&
        root.contains(active) &&
        active.closest(`[${FOLD.part}="${FOLD.toggle}"]`) !== null;
      contentLeft = content.getBoundingClientRect().left;
      followers = [];
      // The view in the content stops the value that this motion follows
      // before it gives the next one, and that stop is not the end.
      shown?.driver.unwatch();
      captured = engine.reducedMotion
        ? null
        : readLeaving(to === "out" ? "sidebar" : "rail");
    },

    play(to) {
      const leaving = captured;
      captured = null;
      keepFocus();
      if (engine.reducedMotion) {
        stop();
        if (!isLaidOut(rail)) return;
        const shown = createMotionValue(engine, 0);
        shown.to(1, { tween: { duration: CROSS_FADE } });
        fade = bind(rail, shown, {
          pose: (at) => ({ opacity: at.toFixed(3) }),
          rest: "clear",
        });
        return;
      }
      const target = to === "in" ? 1 : 0;
      const showing = readForm(to === "in" ? "sidebar" : "rail");
      const shownFollowers = followers.filter(({ view }) => isShown(view));
      followers = [];
      if (
        leaving === null ||
        showing === null ||
        leaving.name === showing.name
      ) {
        stop();
        return;
      }
      fade?.unbind();
      fade = null;
      const openNow =
        shown === null
          ? 1 - target
          : shown.driver.openAt(shown.driver.value.get());
      run ??=
        to === "in" ? startRun(leaving, showing) : startRun(showing, leaving);
      const playing = run;
      const { edges } = playing;
      const span = edges.sidebar - edges.rail;
      const end = () => {
        if (run === playing) stop();
      };
      const lead =
        shownFollowers
          .map(({ slide }) => slide)
          .find((slide) => slide !== null) ?? null;
      // The view can stop its value. The last part of a spring shows no
      // motion, and the page shows no focus ring on a part that a copy
      // stands in for. Thus the run ends when the sidebar shows at rest.
      const watch = (value: MotionValue, openAt: (at: number) => number) =>
        value.subscribe(() => {
          const away = Math.abs(openAt(value.get()) - target) * span;
          const speed =
            Math.abs(openAt(value.getVelocity()) - openAt(0)) * span;
          if (!value.isMoving || (away < REST_PX && speed < REST_SPEED)) end();
        });
      // This also drops a motion of `open` from a press before.
      open.set(openNow);
      // The content is `at` px from its place, which is the inline end of
      // the form that shows now.
      const place = edges[showing.name];
      const leadAt = (at: number) => (place + at - edges.rail) / span;
      const ownAt = (at: number) => at;
      const driver: Driver =
        lead !== null && span > 0
          ? { value: lead, openAt: leadAt, unwatch: watch(lead, leadAt) }
          : { value: open, openAt: ownAt, unwatch: watch(open, ownAt) };
      show(playing, leaving, showing, driver, shownFollowers.length === 0);
      if (driver.value === open) open.to(target);
      if (!driver.value.isMoving) end();
    },

    follow(view, slide) {
      followers.push({ view, slide });
    },

    contentShift() {
      return contentLeft === null
        ? 0
        : contentLeft - content.getBoundingClientRect().left;
    },

    destroy() {
      captured = null;
      stop();
    },
  };
}

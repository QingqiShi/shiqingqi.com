import { MAX_PIXEL_RATIO } from "./constants.ts";
import { createContentAtlas } from "./create-content-atlas.ts";
import {
  EFFECT_CONTENT,
  EFFECT_CONTENT_DRAWN,
  EFFECT_MARKS,
  OMITTED,
  type ContentMode,
} from "./effect-content.ts";
import { forgetInlinedFontFaces } from "./inline-font-faces.ts";
import { rasterizeContent, type ContentImage } from "./rasterize-content.ts";

/** A registered element as the snapshots see it in a frame. */
interface Snapshotted {
  readonly element: Element;
  /** The size of its border box with its transform, in CSS px. */
  readonly width: number;
  readonly height: number;
}

interface Watch {
  /** The key of its image in the atlas. */
  readonly key: number;
  readonly element: Element;
  /** The size of its border box without its own transform, in CSS px. */
  width: number;
  height: number;
  pixelRatio: number;
  /** An effect drew over the content in the last frame that effects updated. */
  drawn: boolean;
  /** An effect draws over the content in this frame. */
  drawing: boolean;
  /** The parts whose content an effect owns in this frame. */
  owning: Set<Element>;
  /** The parts that have `EFFECT_CONTENT_DRAWN`. */
  marked: Set<Element>;
  image: ContentImage | null;
  /** The image does not show the content as it is now. */
  stale: boolean;
  /** A draw of the image is queued or runs. */
  busy: boolean;
  readonly stop: () => void;
}

/**
 * How far the size of the element can be from the size of its image, in
 * CSS px, before an effect stops using the image.
 */
const SIZE_TOLERANCE = 8;

/** The properties of an inline style that move an element and do not change its content. */
const MOVES = new Set(["transform", "translate", "scale", "rotate"]);

/** The inline style of `element`, without the properties that only move it. */
function stillStyleOf(element: Element) {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
    return "";
  }
  const { style } = element;
  let text = "";
  for (let index = 0; index < style.length; index++) {
    const property = style.item(index);
    if (!MOVES.has(property)) {
      text += `${property}:${style.getPropertyValue(property)};`;
    }
  }
  return text;
}

/**
 * The size of the border box of `element` without its own transform, to the
 * whole CSS px, or `width` by `height` when it has no layout size.
 */
function ownSizeOf(element: Element, width: number, height: number) {
  return element instanceof HTMLElement
    ? { width: element.offsetWidth, height: element.offsetHeight }
    : { width, height };
}

/** A new stylesheet that can change how content looks. */
const isStylesheet = (node: Node | EventTarget | null) =>
  node instanceof HTMLStyleElement ||
  (node instanceof HTMLLinkElement && node.relList.contains("stylesheet"));

/** `node` is in the content of `root`, outside each part it omits. */
function inContent(root: Element, node: Node | null) {
  const element =
    node instanceof Element ? node : (node?.parentElement ?? null);
  if (element === null || element === root || !root.contains(element)) {
    return false;
  }
  const omitted = element.closest(OMITTED);
  return omitted === null || !root.contains(omitted);
}

/** A moment after the next frame, or when the page is idle. */
function later(callback: () => void) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(callback, { timeout: 100 });
  } else {
    requestAnimationFrame(() => {
      setTimeout(callback, 0);
    });
  }
}

/**
 * The snapshot of the content of each registered element with
 * `EFFECT_CONTENT`, in one texture, as `createContentAtlas` holds them, for
 * `contentAt`. Each snapshot is drawn ahead of the effects that use it, off
 * their frames, and again when the content changes: a change in it, a
 * change of an attribute of the element, a scroll of the element, its size,
 * the pixel ratio, a font or a stylesheet that loads, or the theme. A
 * transform of the element itself does not change the snapshot, which is in
 * the element's own px. While an effect draws
 * over the content and a transition in it runs, such as the colour of a
 * label, the snapshot is drawn again as soon as the last one is done. An
 * element has no snapshot until the first one is drawn, or when the browser
 * cannot draw it.
 *
 * @internal
 */
export function createContentSnapshots(
  device: GPUDevice,
  requestFrame: () => void,
) {
  const atlas = createContentAtlas(device);
  /**
   * The watch of each element, kept while the element stays registered,
   * also when it registers again with a new id.
   */
  const watches = new Map<Element, Watch>();
  let nextKey = 1;

  function refresh(watch: Watch) {
    watch.stale = true;
    if (watch.busy) {
      return;
    }
    watch.busy = true;
    later(() => {
      void rasterize(watch);
    });
  }

  function refreshAll() {
    for (const watch of watches.values()) {
      refresh(watch);
    }
  }

  async function rasterize(watch: Watch) {
    if (watches.get(watch.element) !== watch) {
      return;
    }
    watch.stale = false;
    try {
      const image = await rasterizeContent(watch.element, watch.pixelRatio);
      if (watches.get(watch.element) === watch) {
        atlas.put(watch.key, image.canvas);
        watch.image = image;
        if (watch.drawn) {
          requestFrame();
        }
      }
    } catch {
      atlas.remove(watch.key);
      watch.image = null;
    } finally {
      watch.busy = false;
      if (watch.drawn && isTransitioning(watch.element)) {
        watch.stale = true;
      }
      if (watch.stale && watches.get(watch.element) === watch) {
        refresh(watch);
      }
    }
  }

  function isTransitioning(root: Element) {
    return root
      .getAnimations({ subtree: true })
      .some(
        (animation) =>
          (animation.pending || animation.playState === "running") &&
          animation.effect instanceof KeyframeEffect &&
          inContent(root, animation.effect.target),
      );
  }

  function watch(element: Element, onChange: () => void) {
    let stillStyle = stillStyleOf(element);
    const changesContent = (record: MutationRecord) => {
      if (EFFECT_MARKS.has(record.attributeName ?? "")) {
        return false;
      }
      if (record.target !== element) {
        return inContent(element, record.target);
      }
      if (record.attributeName !== "style") {
        return true;
      }
      const style = stillStyleOf(element);
      const changed = style !== stillStyle;
      stillStyle = style;
      return changed;
    };
    const mutations = new MutationObserver((records) => {
      if (records.some(changesContent)) {
        onChange();
      }
    });
    mutations.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    const onTransition = (event: Event) => {
      if (event.target instanceof Node && inContent(element, event.target)) {
        onChange();
      }
    };
    const onScroll = onChange;
    const events = ["transitionrun", "transitionend", "transitioncancel"];
    for (const type of events) {
      element.addEventListener(type, onTransition);
    }
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      mutations.disconnect();
      for (const type of events) {
        element.removeEventListener(type, onTransition);
      }
      element.removeEventListener("scroll", onScroll);
    };
  }

  function placeOf({
    element,
  }: Snapshotted): readonly [number, number, number, number] | undefined {
    const known = watches.get(element);
    const image = known?.image ?? null;
    if (
      known === undefined ||
      image === null ||
      Math.abs(image.width - known.width) > SIZE_TOLERANCE ||
      Math.abs(image.height - known.height) > SIZE_TOLERANCE
    ) {
      return undefined;
    }
    const place = atlas.placeOf(known.key);
    if (place === undefined) {
      return undefined;
    }
    const { offset, pixelRatio } = image;
    const across = pixelRatio / place.textureWidth;
    const down = pixelRatio / place.textureHeight;
    return [
      place.x / place.textureWidth + offset[0] * across,
      place.y / place.textureHeight + offset[1] * down,
      image.width * across,
      image.height * down,
    ];
  }

  function draw(
    element: Snapshotted,
    mode: ContentMode,
    parts?: readonly Element[],
  ) {
    const known = watches.get(element.element);
    if (known === undefined || placeOf(element) === undefined) {
      return false;
    }
    known.drawing = true;
    if (mode === "own") {
      for (const part of parts ?? [element.element]) {
        known.owning.add(part);
      }
    }
    return true;
  }

  function unmark(known: Watch) {
    for (const part of known.marked) {
      part.removeAttribute(EFFECT_CONTENT_DRAWN);
    }
    known.marked.clear();
  }

  const themes = window.matchMedia("(prefers-color-scheme: dark)");
  themes.addEventListener("change", refreshAll);
  const onFontLoad = () => {
    forgetInlinedFontFaces();
    refreshAll();
  };
  document.fonts.addEventListener("loadingdone", onFontLoad);
  const pageMutations = new MutationObserver(refreshAll);
  pageMutations.observe(document.documentElement, { attributes: true });
  pageMutations.observe(document.body, { attributes: true });
  const onSheetLoad = (event: Event) => {
    if (isStylesheet(event.target)) {
      refreshAll();
    }
  };
  document.addEventListener("load", onSheetLoad, true);
  const sheetMutations = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          isStylesheet(record.target) ||
          isStylesheet(record.target.parentNode) ||
          [...record.addedNodes, ...record.removedNodes].some(isStylesheet),
      )
    ) {
      refreshAll();
    }
  });
  sheetMutations.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return {
    sampler: atlas.sampler,
    view: atlas.view,
    /**
     * Watches each of `elements` with `EFFECT_CONTENT`, and stops watching
     * each element that is not one of them. Call it each frame, before the
     * effects update.
     */
    sync(elements: readonly Snapshotted[]) {
      const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
      const seen = new Set<Element>();
      for (const record of elements) {
        const { element } = record;
        if (!element.hasAttribute(EFFECT_CONTENT)) {
          continue;
        }
        seen.add(element);
        const { width, height } = ownSizeOf(
          element,
          record.width,
          record.height,
        );
        const known = watches.get(element);
        if (known === undefined) {
          const added: Watch = {
            key: nextKey++,
            element,
            width,
            height,
            pixelRatio: ratio,
            drawn: false,
            drawing: false,
            owning: new Set(),
            marked: new Set(),
            image: null,
            stale: true,
            busy: false,
            stop: watch(element, () => {
              refresh(added);
            }),
          };
          watches.set(element, added);
          refresh(added);
        } else if (
          known.width !== width ||
          known.height !== height ||
          known.pixelRatio !== ratio
        ) {
          known.width = width;
          known.height = height;
          known.pixelRatio = ratio;
          refresh(known);
        }
      }
      for (const [element, known] of watches) {
        if (!seen.has(element)) {
          unmark(known);
          known.stop();
          watches.delete(element);
          atlas.remove(known.key);
        }
      }
    },
    /**
     * Where the snapshot of `element` is in the texture, as
     * `EffectElement.content` takes it, or `undefined` when it has none
     * near the size of the element.
     */
    placeOf,
    /** As `EffectFrame.drawContent`. */
    draw,
    /**
     * Marks each part whose content an effect owns in this frame with
     * `EFFECT_CONTENT_DRAWN`, and unmarks the others. Call it each frame,
     * after the effects update.
     */
    settle() {
      for (const known of watches.values()) {
        for (const part of known.marked) {
          if (!known.owning.has(part)) {
            part.removeAttribute(EFFECT_CONTENT_DRAWN);
          }
        }
        for (const part of known.owning) {
          if (!known.marked.has(part)) {
            part.setAttribute(EFFECT_CONTENT_DRAWN, "");
          }
        }
        [known.marked, known.owning] = [known.owning, known.marked];
        known.owning.clear();
        known.drawn = known.drawing;
        known.drawing = false;
      }
    },
    destroy() {
      for (const known of watches.values()) {
        unmark(known);
        known.stop();
      }
      watches.clear();
      themes.removeEventListener("change", refreshAll);
      document.fonts.removeEventListener("loadingdone", onFontLoad);
      pageMutations.disconnect();
      document.removeEventListener("load", onSheetLoad, true);
      sheetMutations.disconnect();
      atlas.destroy();
    },
  };
}

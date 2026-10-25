import { parseCssColor } from "../effect-layer/parse-css-color.ts";
import { mix, smoothstep, Spring, unit } from "../spring.ts";

const LIFT_SPRING = { response: 0.5, damping: 0.86 } as const;
const TEXT_STYLES = [
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
] as const;
const MAX_FRAME = 1 / 30;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function boxOf(element: Element): Box {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left, y: top, width, height };
}

function px(value: number) {
  return `${value.toFixed(2)}px`;
}

function radiusOf(element: Element) {
  return Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
}

/** The first fill that is not see-through, from `element` out. */
function fillOf(element: Element) {
  for (
    let node: Element | null = element;
    node !== null;
    node = node.parentElement
  ) {
    const fill = getComputedStyle(node).backgroundColor;
    const color = parseCssColor(fill);
    if (color !== null && color[3] > 0.99) return fill;
  }
  return "Canvas";
}

interface SheetLiftParts {
  readonly card: HTMLElement;
  readonly mover: HTMLElement;
  readonly dim: HTMLElement;
  /** The parts of the card's content, which fade in late. */
  readonly content: readonly HTMLElement[];
}

interface SheetLiftEvents {
  readonly onProgress: (progress: number) => void;
}

interface SheetLiftStart {
  /** 0 where the card starts in the element, 1 where it starts at rest. */
  readonly progress: 0 | 1;
  /** How far down from its rest a drag left the card. */
  readonly drop: number;
  /** How far in the page under the card is, which a drag lowers. */
  readonly shown: number;
}

/**
 * The card of a Sheet that lifts out of an element on the page, such as
 * the row that opened it, and goes back into it. The card shows through a
 * window that grows from the element's box to the card's own, with a copy
 * of the element on top that fades out, and the card's content fades in
 * late. `progress` is 1 where the card is at rest. The element's box is read
 * at each frame, so the card follows it as the page under the card moves.
 *
 * @internal
 */
export class SheetLift {
  private readonly spring: Spring;
  private readonly ghost: HTMLElement;
  private readonly origin: HTMLElement;
  private from: Box;
  private readonly fromRadius: number;
  private readonly card: Box;
  private readonly cardRadius: number;
  private frame = 0;
  private last = 0;
  private onDone: (() => void) | null = null;
  /** Where a drag left the card, against its rest. */
  private readonly dragged: { readonly drop: number; readonly loss: number };
  /** How much of `dragged` is left at the last `go`. */
  private draggedShare: number;
  /** The progress where the card starts back to rest, or `null` where it does not. */
  private restFrom: number | null = null;

  private readonly parts: SheetLiftParts;
  private readonly events: SheetLiftEvents;

  constructor(
    origin: HTMLElement,
    parts: SheetLiftParts,
    events: SheetLiftEvents,
    start: SheetLiftStart = { progress: 0, drop: 0, shown: 1 },
  ) {
    this.parts = parts;
    this.events = events;
    this.origin = origin;
    this.spring = new Spring(start.progress, LIFT_SPRING);
    this.dragged = { drop: start.drop, loss: 1 - unit(start.shown) };
    this.draggedShare = start.progress;
    parts.mover.style.transform = "none";
    parts.mover.style.opacity = "1";
    this.from = boxOf(origin);
    this.fromRadius = radiusOf(origin);
    this.card = boxOf(parts.card);
    this.cardRadius = radiusOf(parts.card);
    const ghost = origin.cloneNode(true);
    if (!(ghost instanceof HTMLElement)) throw new TypeError("No copy");
    this.ghost = ghost;
    const style = getComputedStyle(origin);
    for (const property of TEXT_STYLES) {
      this.ghost.style.setProperty(property, style.getPropertyValue(property));
    }
    Object.assign(this.ghost.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: px(this.from.width),
      height: px(this.from.height),
      margin: "0",
      boxSizing: "border-box",
      backgroundColor: fillOf(origin),
      pointerEvents: "none",
      zIndex: "1",
    });
    this.ghost.setAttribute("aria-hidden", "true");
    this.ghost.inert = true;
    parts.card.append(this.ghost);
  }

  /** Whether the card is on its way to rest or at rest, not on its way back. */
  get isLifting() {
    return this.spring.target === 1;
  }

  /** Springs the card to rest at 1 or back into the element at 0, then calls `onDone`. */
  go(target: 0 | 1, onDone?: () => void) {
    this.onDone = onDone ?? null;
    this.draggedShare = this.draggedShareNow();
    this.restFrom = target === 1 ? this.spring.value : null;
    this.spring.to(target);
    this.render();
    if (this.frame === 0) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  /** Stops where it is, and takes off every style it wrote. */
  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.ghost.remove();
    const { card, mover, content } = this.parts;
    card.style.removeProperty("clip-path");
    mover.style.removeProperty("transform");
    for (const element of content) element.style.removeProperty("opacity");
  }

  private readonly tick = (now: number) => {
    const seconds = Math.min(MAX_FRAME, (now - this.last) / 1000);
    this.last = now;
    this.spring.step(seconds);
    this.render();
    if (this.spring.isMoving) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    this.frame = 0;
    const onDone = this.onDone;
    this.onDone = null;
    if (this.spring.value === 1) this.stop();
    onDone?.();
  };

  /**
   * How much of the pose that a drag left is in the motion now. It stays on
   * the way into the element, and goes on the way back to rest.
   */
  private draggedShareNow() {
    if (this.restFrom === null) return this.draggedShare;
    if (this.restFrom >= 1) return 0;
    return (
      this.draggedShare * unit((1 - this.spring.value) / (1 - this.restFrom))
    );
  }

  private render() {
    const progress = this.spring.value;
    const shown = unit(progress);
    const { card, mover, dim, content } = this.parts;
    const share = this.draggedShareNow();
    const pageShown = shown * (1 - this.dragged.loss * share);
    // The page under the card moves back with the progress, so the element
    // is read after that move.
    this.events.onProgress(pageShown);
    if (this.origin.isConnected) this.from = boxOf(this.origin);
    const x = mix(this.from.x, this.card.x, progress);
    const y = mix(
      this.from.y,
      this.card.y + this.dragged.drop * share,
      progress,
    );
    const width = Math.max(1, mix(this.from.width, this.card.width, progress));
    const height = Math.max(
      1,
      mix(this.from.height, this.card.height, progress),
    );
    mover.style.transform = `translate(${px(x - this.card.x)}, ${px(y - this.card.y)})`;
    card.style.clipPath = `inset(0 ${px(Math.max(0, this.card.width - width))} ${px(Math.max(0, this.card.height - height))} 0 round ${px(mix(this.fromRadius, this.cardRadius, shown))})`;
    this.ghost.style.opacity = (1 - smoothstep(0, 0.5, progress)).toFixed(3);
    const opacity = smoothstep(0.3, 0.8, progress).toFixed(3);
    for (const element of content) element.style.opacity = opacity;
    dim.style.opacity = pageShown.toFixed(3);
  }
}

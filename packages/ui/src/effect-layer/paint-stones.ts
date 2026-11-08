import { smoothstep } from "../motion/mix.ts";
import { elementBoxDistance } from "./element-box-distance.ts";
import { POND, POND_BEND, PROFILE_STEP } from "./pond.ts";
import { readCornerExponent, resolveCornerRadii } from "./read-element-box.ts";

/**
 * How far the map reaches past each edge of the element, in px, so that
 * the water also bends its focus ring.
 *
 * @internal
 */
export const FOCUS_RING_MARGIN = 6;
/**
 * The most that the map bends the content, in px.
 *
 * @internal
 */
export const MAX_BEND = 8;
const BEND_GAIN = (127 * POND_BEND) / MAX_BEND;
const NEUTRAL = 128;
const BMP_HEADER = 54;

/** A box of map pixels, from `left` and `top` up to `right` and `bottom`. */
interface Area {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

function joinAreas(first: Area | null, second: Area): Area {
  if (first === null) return second;
  return {
    left: Math.min(first.left, second.left),
    top: Math.min(first.top, second.top),
    right: Math.max(first.right, second.right),
    bottom: Math.max(first.bottom, second.bottom),
  };
}

/**
 * A 24-bit BMP file of `columns` by `rows` pixels, all neutral. Its rows go
 * from the bottom up, `stride` bytes each, and each pixel is blue, green,
 * red.
 */
function neutralBmp(columns: number, rows: number) {
  const stride = Math.ceil((columns * 3) / 4) * 4;
  const bytes = new Uint8Array(BMP_HEADER + stride * rows);
  const header = new DataView(bytes.buffer);
  header.setUint16(0, 0x4d42, true);
  header.setUint32(2, bytes.length, true);
  header.setUint32(10, BMP_HEADER, true);
  header.setUint32(14, 40, true);
  header.setInt32(18, columns, true);
  header.setInt32(22, rows, true);
  header.setUint16(26, 1, true);
  header.setUint16(28, 24, true);
  header.setUint32(34, stride * rows, true);
  bytes.fill(NEUTRAL, BMP_HEADER);
  return { bytes, stride };
}

/**
 * The displacement map of one element, kept from press to press while the
 * element keeps its size, density and corners. Red and green are how far
 * the water bends the content across and down.
 *
 * @internal
 */
export interface Surface {
  readonly key: string;
  readonly density: number;
  readonly columns: number;
  readonly rows: number;
  // The map is a BMP file. A BMP file has no compression, thus a frame
  // costs only one copy of its pixels, not an encode.
  readonly bmp: Uint8Array<ArrayBuffer>;
  readonly stride: number;
  /**
   * How much each map pixel bends for a slope of 1, less on the shore, or
   * `NaN` until `gainOf` finds it.
   */
  readonly gains: Float32Array;
  readonly gainOf: (pixel: number) => number;
  /**
   * The sum of the bends of the rings, before the gain, on a grid of one
   * point for each px: point (`i`, `j`) is on map pixel (`i * density`,
   * `j * density`). The rings are smooth, so the map takes the bend between
   * the points from the points around it. Thus each stone costs less.
   */
  readonly grid: {
    readonly columns: number;
    readonly rows: number;
    readonly across: Float32Array;
    readonly down: Float32Array;
  };
  /** The area that the last rings painted, which is not neutral yet. */
  stale: Area | null;
}

const surfaces = new WeakMap<HTMLElement, Surface>();

/**
 * The map of `element` at `width` by `height` px, with `density` map
 * pixels for each px.
 *
 * @internal
 */
export function surfaceOf(
  element: HTMLElement,
  width: number,
  height: number,
  density: number,
): Surface {
  const style = getComputedStyle(element);
  const corners = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ] as const;
  const shape = style.getPropertyValue("corner-top-left-shape");
  const key = [width, height, density, ...corners, shape].join(" ");
  const kept = surfaces.get(element);
  if (kept?.key === key) return kept;
  const columns = Math.ceil((width + 2 * FOCUS_RING_MARGIN) * density);
  const rows = Math.ceil((height + 2 * FOCUS_RING_MARGIN) * density);
  const { bytes, stride } = neutralBmp(columns, rows);
  const box = {
    width,
    height,
    radii: resolveCornerRadii(width, height, corners),
    cornerExponent: readCornerExponent(shape),
  };
  const gains = new Float32Array(columns * rows).fill(Number.NaN);
  const gridColumns = Math.floor((columns - 1) / density) + 2;
  const gridRows = Math.floor((rows - 1) / density) + 2;
  const surface: Surface = {
    key,
    density,
    columns,
    rows,
    bmp: bytes,
    stride,
    gains,
    gainOf(pixel) {
      const column = pixel % columns;
      const row = (pixel - column) / columns;
      const inside = -elementBoxDistance(
        box,
        (column + 0.5) / density - FOCUS_RING_MARGIN,
        (row + 0.5) / density - FOCUS_RING_MARGIN,
      );
      const gain = BEND_GAIN * smoothstep(0, POND.shore, inside);
      gains[pixel] = gain;
      return gain;
    },
    grid: {
      columns: gridColumns,
      rows: gridRows,
      across: new Float32Array(gridColumns * gridRows),
      down: new Float32Array(gridColumns * gridRows),
    },
    stale: null,
  };
  surfaces.set(element, surface);
  return surface;
}

/** The byte of the blue of the map pixel at `column` in `row`. */
function byteOf(surface: Surface, column: number, row: number) {
  return BMP_HEADER + (surface.rows - 1 - row) * surface.stride + column * 3;
}

function calmArea(surface: Surface, area: Area) {
  for (let row = area.top; row < area.bottom; row++) {
    surface.bmp.fill(
      NEUTRAL,
      byteOf(surface, area.left, row),
      byteOf(surface, area.right, row),
    );
  }
}

/**
 * One stone in the frame that a map shows.
 *
 * @internal
 */
export interface StoneFrame {
  readonly x: number;
  readonly y: number;
  readonly profile: Float32Array;
  /** The distance from the stone inside which its water is calm, in px. */
  readonly calm: number;
}

/** The box of grid points that the rings of `stone` reach. */
function gridAreaOf(surface: Surface, stone: StoneFrame): Area {
  const { density, grid } = surface;
  const centreColumn = stone.x + FOCUS_RING_MARGIN - 0.5 / density;
  const centreRow = stone.y + FOCUS_RING_MARGIN - 0.5 / density;
  const outer = stone.profile.length * PROFILE_STEP + 1;
  return {
    left: Math.max(0, Math.floor(centreColumn - outer)),
    top: Math.max(0, Math.floor(centreRow - outer)),
    right: Math.min(grid.columns, Math.ceil(centreColumn + outer) + 1),
    bottom: Math.min(grid.rows, Math.ceil(centreRow + outer) + 1),
  };
}

/**
 * Adds the bend of the rings of `stone` to the grid, for a slope of 1, in
 * the ring between its calm water and its front.
 */
function addStone(surface: Surface, stone: StoneFrame, area: Area) {
  const { density } = surface;
  const { columns, across, down } = surface.grid;
  const { profile } = stone;
  const last = profile.length - 1;
  const reach = profile.length * PROFILE_STEP;
  const perStep = 1 / PROFILE_STEP;
  const centreColumn = stone.x + FOCUS_RING_MARGIN - 0.5 / density;
  const centreRow = stone.y + FOCUS_RING_MARGIN - 0.5 / density;
  const outer = reach + 1;
  const inner = Math.max(0, stone.calm - 1);
  const addSpan = (row: number, first: number, end: number) => {
    const dy = row - centreRow;
    const dy2 = dy * dy;
    let point = row * columns + first;
    for (let column = first; column < end; column++, point++) {
      const dx = column - centreColumn;
      const distance = Math.sqrt(dx * dx + dy2);
      if (distance <= 0 || distance >= reach) continue;
      const place = distance * perStep;
      const below = Math.floor(place);
      if (below >= last) continue;
      const from = profile[below] ?? 0;
      const slope = from + ((profile[below + 1] ?? 0) - from) * (place - below);
      const bend = slope / distance;
      across[point] = (across[point] ?? 0) + bend * dx;
      down[point] = (down[point] ?? 0) + bend * dy;
    }
  };
  for (let row = area.top; row < area.bottom; row++) {
    const rise = row - centreRow;
    const outerHalf = Math.sqrt(Math.max(0, outer * outer - rise * rise));
    const innerHalf =
      Math.abs(rise) < inner ? Math.sqrt(inner * inner - rise * rise) : 0;
    const left = Math.max(area.left, Math.floor(centreColumn - outerHalf));
    const right = Math.min(area.right - 1, Math.ceil(centreColumn + outerHalf));
    const innerLeft = Math.ceil(centreColumn - innerHalf);
    const innerRight = Math.floor(centreColumn + innerHalf);
    if (innerLeft > innerRight) {
      addSpan(row, left, right + 1);
    } else {
      addSpan(row, left, Math.min(right, innerLeft) + 1);
      addSpan(row, Math.max(left, innerRight), right + 1);
    }
  }
}

/**
 * Paints the bend of the water of `stones` into the map of `surface`: the
 * sum of the bends of their rings. The rest of the map is neutral.
 *
 * @internal
 */
export function paintStones(surface: Surface, stones: readonly StoneFrame[]) {
  const { density, columns, rows, bmp, gains, gainOf, grid } = surface;
  if (surface.stale !== null) calmArea(surface, surface.stale);
  surface.stale = null;
  let gridArea: Area | null = null;
  const areas = stones.map((stone) => gridAreaOf(surface, stone));
  for (const each of areas) gridArea = joinAreas(gridArea, each);
  if (gridArea === null) return;
  for (let row = gridArea.top; row < gridArea.bottom; row++) {
    const from = row * grid.columns;
    grid.across.fill(0, from + gridArea.left, from + gridArea.right);
    grid.down.fill(0, from + gridArea.left, from + gridArea.right);
  }
  for (const [index, stone] of stones.entries()) {
    addStone(surface, stone, areas[index] ?? gridArea);
  }
  const area: Area = {
    left: gridArea.left * density,
    top: gridArea.top * density,
    right: Math.min(columns, (gridArea.right - 1) * density),
    bottom: Math.min(rows, (gridArea.bottom - 1) * density),
  };
  surface.stale = area;
  const { across, down } = grid;
  for (let row = area.top; row < area.bottom; row++) {
    const above = Math.floor(row / density);
    const down01 = (row - above * density) / density;
    const top = above * grid.columns;
    const bottom = top + grid.columns;
    let pixel = row * columns + area.left;
    let byte = byteOf(surface, area.left, row);
    for (let column = area.left; column < area.right; column++) {
      const before = Math.floor(column / density);
      const along = (column - before * density) / density;
      const a = top + before;
      const b = bottom + before;
      const acrossTop =
        (across[a] ?? 0) + ((across[a + 1] ?? 0) - (across[a] ?? 0)) * along;
      const acrossBottom =
        (across[b] ?? 0) + ((across[b + 1] ?? 0) - (across[b] ?? 0)) * along;
      const downTop =
        (down[a] ?? 0) + ((down[a + 1] ?? 0) - (down[a] ?? 0)) * along;
      const downBottom =
        (down[b] ?? 0) + ((down[b + 1] ?? 0) - (down[b] ?? 0)) * along;
      const x = acrossTop + (acrossBottom - acrossTop) * down01;
      const y = downTop + (downBottom - downTop) * down01;
      if (x !== 0 || y !== 0) {
        let gain = gains[pixel] ?? 0;
        if (Number.isNaN(gain)) gain = gainOf(pixel);
        bmp[byte + 1] =
          NEUTRAL + Math.round(Math.max(-127, Math.min(127, y * gain)));
        bmp[byte + 2] =
          NEUTRAL + Math.round(Math.max(-127, Math.min(127, x * gain)));
      }
      pixel++;
      byte += 3;
    }
  }
}

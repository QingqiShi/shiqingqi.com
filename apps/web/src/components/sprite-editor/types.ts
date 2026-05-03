/**
 * Shared types for the sprite editor.
 *
 * The editor's mental model: a single source image is overlaid with a grid
 * (rows × cols, with offset + cell-size in source-pixel space). Each grid
 * cell can be sliced out, optionally edited at the configured output
 * resolution, and exported as PNG (Phase 1) or assembled into an animation
 * sprite sheet (Phase 4).
 */

export interface GridConfig {
  /** Number of columns in the slicing grid. */
  cols: number;
  /** Number of rows in the slicing grid. */
  rows: number;
  /** X offset of the first cell's top-left in source-pixel space. */
  offsetX: number;
  /** Y offset of the first cell's top-left in source-pixel space. */
  offsetY: number;
  /** Width of each cell in source-pixel space. */
  cellWidth: number;
  /** Height of each cell in source-pixel space. */
  cellHeight: number;
  /** Horizontal gap between cells in source-pixel space. */
  gapX: number;
  /** Vertical gap between cells in source-pixel space. */
  gapY: number;
}

export interface OutputConfig {
  /** Output cell width in pixels (e.g. 42 for the species sprites). */
  width: number;
  /** Output cell height in pixels. */
  height: number;
}

export interface SourceImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  /** Filename of the imported source, for default download names. */
  name: string;
}

/** Pixel data for an output-resolution cell, stored as RGBA bytes. */
export interface CellPixels {
  width: number;
  height: number;
  /**
   * RGBA bytes, length === width * height * 4. Typed against `ArrayBuffer`
   * (not the looser `ArrayBufferLike`) so the buffer is assignable to
   * `ImageDataArray` and the bytes can be passed straight to
   * `new ImageData(...)` without a defensive copy.
   */
  data: Uint8ClampedArray<ArrayBuffer>;
}

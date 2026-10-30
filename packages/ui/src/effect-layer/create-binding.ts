import type { d } from "typegpu";
import type { EffectBuffer } from "./types.ts";

// A storage entry of a runtime-sized array holds a function that gives
// the array of a size. A schema is a function too, so that it can make
// a value, but it does not give a schema.
type Sized<Schema> = Schema extends ((
  count: number,
) => infer Array extends d.AnyWgslData)
  ? Array
  : Schema;

type BufferFor<Entry> = Entry extends {
  readonly uniform: infer Schema extends d.AnyWgslData;
}
  ? EffectBuffer<Schema, "uniform">
  : Entry extends { readonly storage: infer Schema }
    ? Sized<Schema> extends infer Array extends d.AnyWgslData
      ? EffectBuffer<Array, "storage">
      : never
    : never;

/**
 * The buffer of each entry of a TypeGPU bind group layout with `Entries`.
 *
 * @internal
 */
export type BindGroupInput<Entries> = {
  readonly [Key in keyof Entries]: BufferFor<Entries[Key]>;
};

/**
 * A bind group layout of a `*-layout.ts` module, as
 * `codegen/generate-wgsl.ts` resolves it: the index of its group, the entry
 * of each resource, and the bind group entries of the resources.
 * `Entries` are the entries of the TypeGPU layout, which give the schema of
 * each resource.
 *
 * @internal
 */
export interface EffectLayout<Entries> {
  readonly label: string;
  readonly index: number;
  readonly entries: readonly GPUBindGroupLayoutEntry[];
  readonly bind: (resources: BindGroupInput<Entries>) => GPUBindGroupEntry[];
}

/**
 * What makes a bind group layout, of a layout with any entries.
 *
 * @internal
 */
export type AnyEffectLayout = Pick<
  EffectLayout<unknown>,
  "label" | "index" | "entries"
>;

/**
 * A bind group, and the index of the group that its layout declares.
 *
 * @internal
 */
export interface EffectBindGroup {
  readonly index: number;
  readonly bindGroup: GPUBindGroup;
}

const deviceLayouts = new WeakMap<
  GPUDevice,
  Map<AnyEffectLayout, GPUBindGroupLayout>
>();

/**
 * The bind group layout of `layout` on `device`, made once per device.
 *
 * @internal
 */
export function bindGroupLayoutOf(device: GPUDevice, layout: AnyEffectLayout) {
  let layouts = deviceLayouts.get(device);
  if (layouts === undefined) {
    layouts = new Map();
    deviceLayouts.set(device, layouts);
  }
  let made = layouts.get(layout);
  if (made === undefined) {
    made = device.createBindGroupLayout({
      label: layout.label,
      entries: [...layout.entries],
    });
    layouts.set(layout, made);
  }
  return made;
}

/**
 * A bind group of `layout` that holds `resources`.
 *
 * @internal
 */
export function createBindGroup<Entries>(
  device: GPUDevice,
  layout: EffectLayout<Entries>,
  resources: BindGroupInput<Entries>,
): EffectBindGroup {
  return {
    index: layout.index,
    bindGroup: device.createBindGroup({
      label: layout.label,
      layout: bindGroupLayoutOf(device, layout),
      entries: layout.bind(resources),
    }),
  };
}

/**
 * The bind group of the resources that `resources` returns, made again when
 * one of them is replaced, such as a packed buffer that grew.
 *
 * @internal
 */
export function createBinding<Entries>(
  device: GPUDevice,
  layout: EffectLayout<Entries>,
  resources: () => BindGroupInput<Entries>,
) {
  let bound: Record<string, unknown> = {};
  let bindGroup: EffectBindGroup | null = null;
  return () => {
    const current = resources();
    if (
      bindGroup === null ||
      Object.entries(current).some(([key, resource]) => resource !== bound[key])
    ) {
      bound = current;
      bindGroup = createBindGroup(device, layout, current);
    }
    return bindGroup;
  };
}

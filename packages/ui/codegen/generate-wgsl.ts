#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSyncIfChanged } from "@tuja/codegen-fs";
import * as prettier from "prettier";
import type {
  TgpuBindGroupLayout,
  TgpuComputeFn,
  TgpuFragmentFn,
  TgpuVertexFn,
} from "typegpu";
import type { AnyWgslData, WgslStruct } from "typegpu/data";
import install from "unplugin-typegpu/node";

/**
 * Resolves the effect layer from TypeGPU to plain data, so that the browser
 * loads no TypeGPU. For each pipeline, it resolves the TGSL to WGSL, and
 * writes `src/_generated/wgsl/<pipeline>.ts`: an `EffectShader` with the
 * WGSL and the bind group layout of each group it reads. It writes
 * `src/_generated/wgsl/layouts.ts` with, for each bind group layout and each
 * schema that a `*-layout.ts` module exports, an `EffectLayout` or an
 * `EffectData` of the same name.
 *
 * Usage: node --experimental-strip-types codegen/generate-wgsl.ts
 */

// The TypeGPU plugin must transform each `"use gpu"` function before the
// function loads. Thus, all imports of effect-layer source are dynamic.
install();

const { d, isBindGroupLayout, tgpu } = await import("typegpu");
const [
  { blackHoleShader },
  { debugShader },
  { dustShader },
  { dustSimulation },
  { liquidShader },
  { liquidSimulation },
  { ringLightShader },
  { rippleShader },
] = await Promise.all([
  import("../src/effect-layer/black-hole-shader.ts"),
  import("../src/effect-layer/debug-shader.ts"),
  import("../src/effect-layer/dust-shader.ts"),
  import("../src/effect-layer/dust-simulation.ts"),
  import("../src/effect-layer/liquid-shader.ts"),
  import("../src/effect-layer/liquid-simulation.ts"),
  import("../src/effect-layer/ring-light-shader.ts"),
  import("../src/effect-layer/ripple-shader.ts"),
]);

type Pipeline =
  | { readonly vertex: TgpuVertexFn; readonly fragment: TgpuFragmentFn<never> }
  | { readonly compute: TgpuComputeFn };

/** The entry points of each pipeline. */
const PIPELINES: Record<string, Pipeline> = {
  ripple: rippleShader,
  ringLight: ringLightShader,
  blackHole: blackHoleShader,
  liquid: liquidShader,
  liquidSimulation: { compute: liquidSimulation },
  dustParticles: {
    vertex: dustShader.particleVertex,
    fragment: dustShader.fragment,
  },
  dustMotes: { vertex: dustShader.moteVertex, fragment: dustShader.fragment },
  dustSimulation: { compute: dustSimulation },
  debugBand: debugShader.band,
  debugRect: debugShader.rect,
  debugElement: debugShader.element,
  debugPointer: debugShader.pointer,
};

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const effectLayerDir = path.join(packageRoot, "src", "effect-layer");
const outputDir = path.join(packageRoot, "src", "_generated", "wgsl");

/** The module and the name of each value that a `*-layout.ts` module exports. */
async function layoutExports() {
  const exports = new Map<unknown, { file: string; name: string }>();
  const files = fs
    .readdirSync(effectLayerDir)
    .filter((file) => file.endsWith("-layout.ts"))
    .toSorted();
  for (const file of files) {
    const module: unknown = await import(
      pathToFileURL(path.join(effectLayerDir, file)).href
    );
    for (const [name, value] of Object.entries(module ?? {})) {
      const previous = exports.get(value);
      if (
        previous !== undefined &&
        (d.isWgslData(value) || isBindGroupLayout(value))
      ) {
        throw new Error(
          `${file}: ${name} is the same value as ${previous.name}. Export each schema with one name only.`,
        );
      }
      exports.set(value, { file, name });
    }
  }
  return exports;
}

const varyings = (io: object | undefined) =>
  Object.entries(io ?? {})
    .filter(([, schema]) => !d.isBuiltin(schema))
    .map(([key]) => key)
    .join(", ");

/**
 * The entry points to resolve together. `tgpu.resolve` gives the vertex
 * output and the fragment input locations in the order of their fields,
 * so these agree only when the fields are in the same order.
 */
function entryPointsOf(name: string, pipeline: Pipeline) {
  if ("compute" in pipeline) {
    return [pipeline.compute];
  }
  const { vertex, fragment } = pipeline;
  const out = varyings(vertex.shell.out);
  const fragmentIn = varyings(fragment.shell.in);
  if (out !== fragmentIn) {
    throw new Error(
      `${name}: the vertex output (${out}) and the fragment input (${fragmentIn}) need the same fields in the same order.`,
    );
  }
  return [vertex, fragment];
}

const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

/** The bytes from one value of `schema` to the next in an array. */
const strideOf = (schema: AnyWgslData) =>
  roundUp(d.sizeOf(schema), d.alignmentOf(schema));

/** Each field of `struct`, with its schema and its byte offset. */
function fieldsOf(struct: WgslStruct) {
  const fields: { key: string; schema: AnyWgslData; offset: number }[] = [];
  let end = 0;
  for (const [key, schema] of Object.entries(struct.propTypes)) {
    if (!d.isWgslData(schema) || d.isDecorated(schema)) {
      throw new Error(`${key}: only a plain WGSL field has a writer.`);
    }
    const offset = roundUp(end, d.alignmentOf(schema));
    fields.push({ key, schema, offset });
    end = offset + d.sizeOf(schema);
  }
  if (roundUp(end, d.alignmentOf(struct)) !== d.sizeOf(struct)) {
    throw new Error("The offsets of a struct do not add up to its size.");
  }
  return fields;
}

const SETTERS: Record<string, string> = {
  f: "setFloat32",
  u: "setUint32",
  i: "setInt32",
};

/**
 * The statements that write `value`, a value of `schema`, at the byte
 * offset `base + constant` of `view`, as WGSL lays it out.
 */
function writerOf(
  schema: AnyWgslData,
  base: string,
  constant: number,
  value: string,
  depth = 0,
): string {
  const at = (extra: number) =>
    constant + extra === 0 ? base : `${base} + ${String(constant + extra)}`;
  if (d.isWgslStruct(schema)) {
    return fieldsOf(schema)
      .map((field) =>
        writerOf(
          field.schema,
          base,
          constant + field.offset,
          `${value}.${field.key}`,
          depth,
        ),
      )
      .join("");
  }
  if (d.isWgslArray(schema)) {
    if (!d.isWgslData(schema.elementType)) {
      throw new Error("Only an array of plain WGSL data has a writer.");
    }
    // As TypeGPU does, write only the values that the array has.
    const index = ["i", "j", "k"][depth] ?? `i${String(depth)}`;
    const stride = strideOf(schema.elementType);
    return [
      `for (let ${index} = 0; ${index} < Math.min(${value}.length, ${String(schema.elementCount)}); ${index}++) {`,
      writerOf(
        schema.elementType,
        `${at(0)} + ${index} * ${String(stride)}`,
        0,
        `${value}[${index}]`,
        depth + 1,
      ),
      "}",
    ].join("\n");
  }
  const vector = /^vec([234])([fiu])$/.exec(schema.type);
  if (vector !== null) {
    const [, count, kind] = vector;
    return Array.from(
      { length: Number(count) },
      (_, component) =>
        `view.${SETTERS[kind]}(${at(component * 4)}, ${value}[${String(component)}], true);\n`,
    ).join("");
  }
  const scalar = /^([fiu])32$/.exec(schema.type);
  if (scalar !== null) {
    return `view.${SETTERS[scalar[1]]}(${at(0)}, ${value}, true);\n`;
  }
  throw new Error(`${schema.type} needs a writer.`);
}

/** The `EffectData` of `schema`, which `source` exports as `name`. */
function renderData(name: string, schema: AnyWgslData, source: string) {
  const offsets = Object.fromEntries(
    d.isWgslStruct(schema)
      ? fieldsOf(schema).map(({ key, offset }) => [key, offset])
      : [],
  );
  return [
    `export const ${name}: EffectData<typeof ${source}.${name}> = {`,
    `  label: ${JSON.stringify(name)},`,
    `  size: ${String(d.sizeOf(schema))},`,
    `  stride: ${String(strideOf(schema))},`,
    `  offsets: ${JSON.stringify(offsets)},`,
    "  write(view, offset, value) {",
    writerOf(schema, "offset", 0, "value"),
    "  },",
    "};",
  ].join("\n");
}

const STAGES = { compute: "COMPUTE", vertex: "VERTEX", fragment: "FRAGMENT" };
const READONLY_STAGES = ["compute", "vertex", "fragment"] as const;
const MUTABLE_STAGES = ["compute", "fragment"] as const;

/**
 * The `EffectLayout` of `layout`, which `source` exports as `name`, with the
 * entries that TypeGPU makes for it.
 */
function renderLayout(
  name: string,
  layout: TgpuBindGroupLayout,
  source: string,
) {
  if (layout.index === undefined) {
    throw new Error(`${name}: give the layout an index with $idx.`);
  }
  const entries: string[] = [];
  const bindings: string[] = [];
  for (const [binding, [key, entry]] of Object.entries(
    layout.entries,
  ).entries()) {
    if (entry === null) {
      throw new Error(`${name}.${key}: an empty entry needs a binding.`);
    }
    let type: string;
    let stages: readonly ("compute" | "vertex" | "fragment")[];
    if ("uniform" in entry) {
      type = "uniform";
      stages = entry.visibility ?? READONLY_STAGES;
    } else if ("storage" in entry) {
      const mutable = entry.access === "mutable";
      type = mutable ? "storage" : "read-only-storage";
      stages = entry.visibility ?? (mutable ? MUTABLE_STAGES : READONLY_STAGES);
    } else {
      throw new Error(`${name}.${key}: only a buffer can be an entry.`);
    }
    const visibility = Object.entries(STAGES)
      .filter(([stage]) => stages.some((given) => given === stage))
      .map(([, flag]) => `GPU_SHADER_STAGE.${flag}`)
      .join(" | ");
    entries.push(
      `{ binding: ${String(binding)}, visibility: ${visibility}, buffer: { type: ${JSON.stringify(type)} } },`,
    );
    bindings.push(
      `{ binding: ${String(binding)}, resource: { buffer: resources.${key}.buffer } },`,
    );
  }
  return [
    `export const ${name}: EffectLayout<(typeof ${source}.${name})["entries"]> = {`,
    `  label: ${JSON.stringify(name)},`,
    `  index: ${String(layout.index)},`,
    `  entries: [${entries.join("\n")}],`,
    `  bind: (resources) => [${bindings.join("\n")}],`,
    "};",
  ].join("\n");
}

/**
 * `src/_generated/wgsl/layouts.ts`: an `EffectLayout` or an `EffectData` for
 * each bind group layout and each schema that a `*-layout.ts` module
 * exports.
 */
function renderLayouts(exports: typeof layouts) {
  const sources = new Set<string>();
  const sourceOf = (file: string) => {
    sources.add(file);
    return `${camel(file.replace(/\.ts$/, ""))}Source`;
  };
  const names = new Set<string>();
  const body: string[] = [];
  for (const [value, { file, name }] of exports) {
    if (!isBindGroupLayout(value) && !d.isWgslData(value)) {
      continue;
    }
    if (names.has(name)) {
      throw new Error(`Two *-layout.ts modules export ${name}.`);
    }
    names.add(name);
    body.push(
      isBindGroupLayout(value)
        ? renderLayout(name, value, sourceOf(file))
        : renderData(name, value, sourceOf(file)),
    );
  }
  return [
    HEADER,
    'import { GPU_SHADER_STAGE } from "../../effect-layer/constants.ts";',
    'import type { EffectLayout } from "../../effect-layer/create-binding.ts";',
    'import type { EffectData } from "../../effect-layer/types.ts";',
    ...[...sources]
      .toSorted()
      .map(
        (file) =>
          `import type * as ${sourceOf(file)} from "../../effect-layer/${file}";`,
      ),
    "",
    body.join("\n\n"),
    "",
  ].join("\n");
}

const HEADER = [
  "// AUTO-GENERATED by packages/ui/codegen/generate-wgsl.ts — do not edit.",
  "// To regenerate: pnpm --filter @tuja/ui codegen",
  "",
].join("\n");

const camel = (name: string) =>
  name.replaceAll(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const kebab = (name: string) =>
  name.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const escapeTemplate = (text: string) => text.replaceAll(/[`\\$]/g, "\\$&");

function render(name: string, pipeline: Pipeline, exports: typeof layouts) {
  const { code, usedBindGroupLayouts, catchall } = tgpu.resolveWithContext(
    entryPointsOf(name, pipeline),
  );
  if (catchall !== undefined) {
    throw new Error(
      `${name}: put each resource that the shader reads in a bind group layout.`,
    );
  }
  const imported = new Set<string>();
  const groups = Array.from(
    { length: usedBindGroupLayouts.length },
    (_, index) => {
      if (!(index in usedBindGroupLayouts)) {
        return "null";
      }
      const source = exports.get(usedBindGroupLayouts[index]);
      if (source === undefined) {
        throw new Error(
          `${name}: export the bind group layout of group ${String(index)} from a *-layout.ts module of src/effect-layer.`,
        );
      }
      imported.add(source.name);
      return source.name;
    },
  );
  return [
    HEADER,
    'import type { EffectShader } from "../../effect-layer/compile-effect-shader.ts";',
    `import { ${[...imported].toSorted().join(", ")} } from "./layouts.ts";`,
    "",
    `export const ${name}Wgsl: EffectShader = {`,
    `  label: ${JSON.stringify(name)},`,
    `  layouts: [${groups.join(", ")}],`,
    `  code: \`${escapeTemplate(code)}\`,`,
    "};",
    "",
  ].join("\n");
}

const layouts = await layoutExports();
const prettierOptions = await prettier.resolveConfig(
  path.join(outputDir, "index.ts"),
);
fs.mkdirSync(outputDir, { recursive: true });
const written = new Set<string>();
async function write(fileName: string, source: string) {
  const filePath = path.join(outputDir, fileName);
  writeFileSyncIfChanged(
    filePath,
    await prettier.format(source, { ...prettierOptions, filepath: filePath }),
  );
  written.add(fileName);
}
await write("layouts.ts", renderLayouts(layouts));
for (const [name, pipeline] of Object.entries(PIPELINES)) {
  await write(`${kebab(name)}.ts`, render(name, pipeline, layouts));
}
// Other runs can write to this directory at the same time, through
// temporary files that do not end in `.ts`. Thus, remove only `.ts` files.
const removed = fs
  .readdirSync(outputDir)
  .filter((file) => file.endsWith(".ts") && !written.has(file));
for (const file of removed) {
  fs.rmSync(path.join(outputDir, file));
}
console.log(
  `Wrote ${String(written.size)} modules to ${outputDir}${removed.length > 0 ? `; removed ${removed.join(", ")}` : ""}`,
);

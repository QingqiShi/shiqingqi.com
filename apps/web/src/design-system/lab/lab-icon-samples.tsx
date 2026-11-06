import type { Icon } from "@phosphor-icons/react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/ssr/FloppyDisk";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { NONE_SAMPLE } from "./define-lab.tsx";
import { withSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const ICON_MODULE = "@phosphor-icons/react/dist/ssr";

/**
 * One Phosphor Icon at the weight of the package's own control glyphs, with
 * the source and the import its snippet has to print.
 */
export function iconNode(name: string, module: string, NodeIcon: Icon) {
  return withSource(<NodeIcon weight="bold" />, `<${name} weight="bold" />`, [
    { name, from: `${ICON_MODULE}/${module}` },
  ]);
}

/** One Phosphor Icon as a sample. */
export function iconSample(
  id: string,
  label: { en: string; zh: string },
  name: string,
  module: string,
  SampleIcon: Icon,
): LabSample {
  return {
    id,
    label,
    code: `<${name} weight="bold" />`,
    imports: [{ name, from: `${ICON_MODULE}/${module}` }],
    value: iconNode(name, module, SampleIcon),
  };
}

/** The Icons a component's `icon` prop offers in its Lab. */
export const labIconSamples: LabSample[] = [
  NONE_SAMPLE,
  iconSample("plus", { en: "Plus", zh: "加号" }, "PlusIcon", "Plus", PlusIcon),
  iconSample(
    "arrowRight",
    { en: "Arrow right", zh: "右箭头" },
    "ArrowRightIcon",
    "ArrowRight",
    ArrowRightIcon,
  ),
  iconSample(
    "floppyDisk",
    { en: "Floppy disk", zh: "磁盘" },
    "FloppyDiskIcon",
    "FloppyDisk",
    FloppyDiskIcon,
  ),
  iconSample(
    "trash",
    { en: "Trash", zh: "垃圾桶" },
    "TrashIcon",
    "Trash",
    TrashIcon,
  ),
];

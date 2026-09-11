import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/ssr/FloppyDisk";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import type { LabSample } from "../types.ts";

const ICON_MODULE = "@phosphor-icons/react/dist/ssr";

/** The option that leaves the prop out altogether. */
const NONE: LabSample = {
  id: "none",
  label: { en: "None", zh: "无" },
  code: "",
  imports: [],
  value: undefined,
};

/** One Phosphor Icon as a sample, with the import its snippet has to print. */
export function iconSample(
  id: string,
  label: { en: string; zh: string },
  name: string,
  module: string,
  value: LabSample["value"],
): LabSample {
  return {
    id,
    label,
    code: `<${name} />`,
    imports: [{ name, from: `${ICON_MODULE}/${module}` }],
    value,
  };
}

/** The Icons a component's `icon` prop offers in its Lab. */
export const labIconSamples: LabSample[] = [
  NONE,
  iconSample(
    "plus",
    { en: "Plus", zh: "加号" },
    "PlusIcon",
    "Plus",
    <PlusIcon />,
  ),
  iconSample(
    "arrowRight",
    { en: "Arrow right", zh: "右箭头" },
    "ArrowRightIcon",
    "ArrowRight",
    <ArrowRightIcon />,
  ),
  iconSample(
    "floppyDisk",
    { en: "Floppy disk", zh: "磁盘" },
    "FloppyDiskIcon",
    "FloppyDisk",
    <FloppyDiskIcon />,
  ),
  iconSample(
    "trash",
    { en: "Trash", zh: "垃圾桶" },
    "TrashIcon",
    "Trash",
    <TrashIcon />,
  ),
];

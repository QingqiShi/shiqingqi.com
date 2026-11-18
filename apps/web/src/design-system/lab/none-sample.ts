import type { LabSample } from "./types.ts";

/** The option that leaves the prop out altogether. */
export const NONE_SAMPLE: LabSample = {
  id: "none",
  label: { en: "None", zh: "无" },
  code: "",
  imports: [],
  value: undefined,
};

"use client";

import { t } from "#src/i18n.ts";

export function DepartmentLabel({ department }: { department: string }) {
  switch (department) {
    case "Acting":
      return t({ en: "Acting", zh: "演员" });
    case "Directing":
      return t({ en: "Directing", zh: "导演" });
    case "Writing":
      return t({ en: "Writing", zh: "编剧" });
    case "Production":
      return t({ en: "Production", zh: "制片" });
    case "Sound":
      return t({ en: "Sound", zh: "音效" });
    case "Camera":
      return t({ en: "Camera", zh: "摄影" });
    case "Editing":
      return t({ en: "Editing", zh: "剪辑" });
    case "Visual Effects":
      return t({ en: "Visual Effects", zh: "视觉特效" });
    case "Crew":
      return t({ en: "Crew", zh: "剧组" });
    case "Art":
      return t({ en: "Art", zh: "美术" });
    case "Costume & Make-Up":
      return t({ en: "Costume & Make-Up", zh: "服装与化妆" });
    case "Lighting":
      return t({ en: "Lighting", zh: "灯光" });
    default:
      return department;
  }
}

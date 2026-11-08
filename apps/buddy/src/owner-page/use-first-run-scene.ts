import { t } from "@tuja/i18n";
import type { SceneOverride } from "#src/pet/build-view.ts";
import type { FirstRunStage } from "./first-run-stage.ts";

/**
 * What the pet says while it waits for the first upload, and the party when that upload lands.
 * Undefined once the pet lives on the page.
 */
export function useFirstRunScene(
  stage: FirstRunStage | null,
  isSprouting: boolean,
): SceneOverride | undefined {
  if (isSprouting) {
    return {
      text: t({ en: "I'm awake!", zh: "我醒啦！" }),
      mood: "party",
      isConfetti: true,
    };
  }
  if (stage === "waiting-mac") {
    return {
      text: t({
        en: "I'm still a seed. Connect your Mac and I'll wake up.",
        zh: "我还是一颗种子。把你的 Mac 连上来，我就会醒。",
      }),
    };
  }
  if (stage === "waiting-data") {
    return {
      text: t({
        en: "Connected! I'll sprout when the first data lands.",
        zh: "连上了！等第一份数据到，我就发芽。",
      }),
    };
  }

  return undefined;
}

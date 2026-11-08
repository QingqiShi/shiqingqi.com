import { t } from "@tuja/i18n";
import { useEffect, useState } from "react";
import type { PickedLine, SceneOverride } from "#src/pet/build-view.ts";
import { buildView, nextLine, sceneInputFor } from "#src/pet/build-view.ts";
import { fillTemplate } from "#src/pet/fill-template.ts";
import { sceneSvg } from "#src/pet/scene-svg.ts";
import type { PetCopy, PublicPetState, Range } from "#src/pet/types.ts";
import { useMinuteClock } from "./use-minute-clock.ts";
import { useSceneBox } from "./use-scene-box.ts";

/** How long the pet hops after a tap. */
const PAT_MS = 1100;

/**
 * What a page needs to draw the pet's scene: the view at this minute, and the props of `Scene`,
 * whose tap pats the pet and asks it for another line. `override` is what the page says and does
 * over the view.
 */
export function usePetScene(
  state: PublicPetState,
  renderedAt: number,
  copy: PetCopy,
  range: Range,
  override?: SceneOverride,
) {
  const clock = useMinuteClock(renderedAt);
  const [line, setLine] = useState<PickedLine | null>(null);
  const [patAt, setPatAt] = useState<number | null>(null);
  const { box, sceneRef, insetRef } = useSceneBox();
  const now = Math.max(clock, line?.at ?? 0);

  useEffect(() => {
    if (patAt === null) return;
    const timer = setTimeout(() => {
      setPatAt(null);
    }, PAT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [patAt]);

  const view = buildView(state, { now, range, copy, line });
  const shown: SceneOverride | undefined =
    patAt === null ? override : { ...override, action: "pat" };

  const onTap = () => {
    const at = new Date().getTime();
    setLine(nextLine(view, line, at));
    setPatAt(at);
  };

  return {
    view,
    now,
    scene: {
      ref: sceneRef,
      insetRef,
      svg: sceneSvg(sceneInputFor(view, box, shown)),
      alt: fillTemplate(
        t({ en: "{name}, {level}: {line}", zh: "{name}，{level}：{line}" }),
        {
          name: copy.petName,
          level: view.levelLabel,
          line: override?.text ?? view.text,
        },
      ),
      tapLabel: t({
        en: "Pat Miao for another line",
        zh: "摸摸小苗，让它再说一句",
      }),
      onTap,
    },
  };
}

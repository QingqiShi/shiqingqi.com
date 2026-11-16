import { t } from "@tuja/i18n";
import { useEffect, useState } from "react";
import type { PickedLine, SceneOverride } from "#src/pet/build-view.ts";
import { buildView, nextLine, sceneInputFor } from "#src/pet/build-view.ts";
import { fillTemplate } from "#src/pet/fill-template.ts";
import { sceneSvg } from "#src/pet/scene-svg.ts";
import type { PetCopy, PublicPetState, Range } from "#src/pet/types.ts";
import { useMinuteClock } from "./use-minute-clock.ts";
import { useSceneBox } from "./use-scene-box.ts";

/** What the visitor can do to the pet, as the buttons on the Mac's pane can. */
export type CareKind = "feed" | "pat";

/** How long each action plays: the pet hops after a tap or a pat, and the water pours. */
const ACTION_MS: Record<CareKind, number> = { feed: 1800, pat: 1100 };
/** How long a hop keeps the pet off the ground. A pat in this time does not start the hop again. */
const HOP_AIR_MS = 800;

/**
 * What a page needs to draw the pet's scene: the view at this minute, the props of `Scene`, whose
 * tap pats the pet and asks it for another line, and `care`, which waters or pats it and gets the
 * line that answers. `override` is what the page says and does over the view.
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
  const [action, setAction] = useState<{ kind: CareKind; at: number } | null>(
    null,
  );
  const [beat, setBeat] = useState(0);
  const [hop, setHop] = useState({ count: 0, at: 0 });
  const { box, sceneRef, insetRef } = useSceneBox();
  const now = Math.max(clock, line?.at ?? 0);

  useEffect(() => {
    if (action === null) return;
    const timer = setTimeout(() => {
      setAction(null);
    }, ACTION_MS[action.kind]);
    return () => {
      clearTimeout(timer);
    };
  }, [action]);

  const view = buildView(state, { now, range, copy, line });
  const shown: SceneOverride = {
    ...override,
    beat,
    hop: hop.count,
    ...(action === null ? {} : { action: action.kind }),
  };

  const startHop = (at: number) => {
    if (at - hop.at >= HOP_AIR_MS) setHop({ count: hop.count + 1, at });
  };

  const onTap = () => {
    const at = new Date().getTime();
    setLine(nextLine(view, line, at));
    setAction({ kind: "pat", at });
    setBeat(beat + 1);
    startHop(at);
  };

  const care = (kind: CareKind) => {
    const at = new Date().getTime();
    setLine(nextLine(view, line, at, kind));
    setAction({ kind, at });
    setBeat(beat + 1);
    if (kind === "pat") startHop(at);
  };

  return {
    view,
    now,
    care,
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

"use client";

import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";
import { Scene } from "#src/owner-page/scene.tsx";
import { REFRESH_MS, useLiveState } from "#src/owner-page/use-live-state.ts";
import { usePetScene } from "#src/owner-page/use-pet-scene.ts";
import type { PublicPetState } from "#src/pet/types.ts";
import { usePetCopy } from "#src/pet/use-pet-copy.ts";

type DemoSceneProps = {
  initialState: PublicPetState;
  /** When the server rendered the page, so that hydration draws the same minute. */
  renderedAt: number;
  /** A real account's pet, which the scene keeps fresh as a visitor's page does. */
  isLive: boolean;
  css?: StyleProp;
  /** The corner marks, laid over the scene. */
  children?: ReactNode;
};

/** The pet on the home page, in the same window as on its own page, and a tap pats it there too. */
export function DemoScene({
  initialState,
  renderedAt,
  isLive,
  css,
  children,
}: DemoSceneProps) {
  const copy = usePetCopy();
  const state = useLiveState(
    initialState,
    isLive ? `/api/v1/u/${encodeURIComponent(initialState.user)}` : null,
    REFRESH_MS,
  );
  const { scene } = usePetScene(state, renderedAt, copy, "30");

  return (
    <Scene {...scene} css={css}>
      {children}
    </Scene>
  );
}

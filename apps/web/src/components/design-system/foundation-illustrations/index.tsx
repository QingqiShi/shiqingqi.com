import type { ReactElement } from "react";
import type { DesignSystemPath } from "#src/components/design-system/routes.ts";
import { BordersIllustration } from "./borders-illustration.tsx";
import { ColorIllustration } from "./color-illustration.tsx";
import { ElevationIllustration } from "./elevation-illustration.tsx";
import { IconographyIllustration } from "./iconography-illustration.tsx";
import { LayoutIllustration } from "./layout-illustration.tsx";
import { MotionIllustration } from "./motion-illustration.tsx";
import { SpacingIllustration } from "./spacing-illustration.tsx";
import { TypographyIllustration } from "./typography-illustration.tsx";

/**
 * Maps each foundations route to its soft-luminous card illustration. Only the
 * eight foundations have art; other overview cards render without it. Values are
 * ready-made elements (the illustrations are static, stateless SVGs), so the
 * overview embeds one directly rather than instantiating a component variable
 * during render.
 */
const FOUNDATION_ILLUSTRATIONS: Partial<
  Record<DesignSystemPath, ReactElement>
> = {
  "/design-system/foundations/color": <ColorIllustration />,
  "/design-system/foundations/typography": <TypographyIllustration />,
  "/design-system/foundations/spacing": <SpacingIllustration />,
  "/design-system/foundations/elevation": <ElevationIllustration />,
  "/design-system/foundations/motion": <MotionIllustration />,
  "/design-system/foundations/borders": <BordersIllustration />,
  "/design-system/foundations/layout": <LayoutIllustration />,
  "/design-system/foundations/iconography": <IconographyIllustration />,
};

export function getFoundationIllustration(
  path: DesignSystemPath,
): ReactElement | undefined {
  return FOUNDATION_ILLUSTRATIONS[path];
}

import type { ReactElement } from "react";
import type {
  DesignSystemFoundationPath,
  DesignSystemPath,
} from "#src/components/design-system/routes/types.ts";
import { AccessibilityIllustration } from "./accessibility-illustration.tsx";
import { BordersIllustration } from "./borders-illustration.tsx";
import { ColorIllustration } from "./color-illustration.tsx";
import { IconographyIllustration } from "./iconography-illustration.tsx";
import { LayoutIllustration } from "./layout-illustration.tsx";
import { MotionIllustration } from "./motion-illustration.tsx";
import { SpacingIllustration } from "./spacing-illustration.tsx";
import { TypographyIllustration } from "./typography-illustration.tsx";
import { VoiceIllustration } from "./voice-illustration.tsx";

/**
 * Each foundations route's card illustration; other overview cards render without
 * one. Total, so a foundation registered in `routes.ts` without an illustration
 * fails to compile rather than shipping a blank tile.
 */
const FOUNDATION_ILLUSTRATIONS: Record<
  DesignSystemFoundationPath,
  ReactElement
> = {
  "/design-system/foundations/color": <ColorIllustration />,
  "/design-system/foundations/typography": <TypographyIllustration />,
  "/design-system/foundations/spacing": <SpacingIllustration />,
  "/design-system/foundations/motion": <MotionIllustration />,
  "/design-system/foundations/borders": <BordersIllustration />,
  "/design-system/foundations/layout": <LayoutIllustration />,
  "/design-system/foundations/iconography": <IconographyIllustration />,
  "/design-system/foundations/accessibility": <AccessibilityIllustration />,
  "/design-system/foundations/voice": <VoiceIllustration />,
};

/**
 * The same map widened, so the overview can ask about any route. Sound without an
 * assertion because the narrow keys are a subset of the wide ones.
 */
const BY_PATH: Partial<Record<DesignSystemPath, ReactElement>> =
  FOUNDATION_ILLUSTRATIONS;

export function getFoundationIllustration(
  path: DesignSystemPath,
): ReactElement | undefined {
  return BY_PATH[path];
}

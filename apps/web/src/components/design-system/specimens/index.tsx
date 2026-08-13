import type { ReactElement } from "react";
import type { DesignSystemPath } from "#src/components/design-system/routes.ts";
import { AvatarSpecimen } from "./avatar-specimen.tsx";
import { BadgeSpecimen } from "./badge-specimen.tsx";
import { BreadcrumbSpecimen } from "./breadcrumb-specimen.tsx";
import { ButtonSpecimen } from "./button-specimen.tsx";
import { CalloutSpecimen } from "./callout-specimen.tsx";
import { CardSpecimen } from "./card-specimen.tsx";
import { CheckboxSpecimen } from "./checkbox-specimen.tsx";
import { ChipSpecimen } from "./chip-specimen.tsx";
import { DisclosureSpecimen } from "./disclosure-specimen.tsx";
import { DividerSpecimen } from "./divider-specimen.tsx";
import { HeaderFooterLayoutSpecimen } from "./header-footer-layout-specimen.tsx";
import { HeadingSpecimen } from "./heading-specimen.tsx";
import { IconButtonSpecimen } from "./icon-button-specimen.tsx";
import { MenuButtonSpecimen } from "./menu-button-specimen.tsx";
import { MovieDetailSpecimen } from "./movie-detail-specimen.tsx";
import { OptionCardSpecimen } from "./option-card-specimen.tsx";
import { OverlaySpecimen } from "./overlay-specimen.tsx";
import { PopoverSpecimen } from "./popover-specimen.tsx";
import { ProgressSpecimen } from "./progress-specimen.tsx";
import { ProgressiveBlurSpecimen } from "./progressive-blur-specimen.tsx";
import { SectionSpecimen } from "./section-specimen.tsx";
import { SegmentedControlSpecimen } from "./segmented-control-specimen.tsx";
import { SelectSpecimen } from "./select-specimen.tsx";
import { SidebarLayoutSpecimen } from "./sidebar-layout-specimen.tsx";
import { SkeletonSpecimen } from "./skeleton-specimen.tsx";
import { SliderSpecimen } from "./slider-specimen.tsx";
import { SpinnerSpecimen } from "./spinner-specimen.tsx";
import { SwitchSpecimen } from "./switch-specimen.tsx";
import { TableSpecimen } from "./table-specimen.tsx";
import { TextFieldSpecimen } from "./text-field-specimen.tsx";
import { TextSpecimen } from "./text-specimen.tsx";
import { TextareaSpecimen } from "./textarea-specimen.tsx";

interface ComponentSpecimen {
  element: ReactElement;
  /**
   * Fills the plate edge to edge instead of sitting on it as a scaled
   * thumbnail. Set by the five miniatures whose subject is a whole page: a
   * page reads as a page when it fills its frame and as a floating card when it
   * doesn't. They also need no scaling-down to say "not a working control" —
   * a wireframe already says that by being a wireframe, whereas a real `Button`
   * at full size does not.
   */
  fillsPlate?: boolean;
}

/**
 * Maps each components route — plus the one composed example — to the specimen
 * shown in its overview tile. The counterpart to `foundation-illustrations/`:
 * foundations get abstract illustrations because a token has no rendered form,
 * whereas a component does — so these are the real components, rendered live,
 * and they cannot drift from the thing they advertise. The six that cannot
 * render their real form inside a tile (Overlay, Menu button, the two page
 * shells, the movie-details example, and Progressive blur) fall back to a
 * miniature drawn from the same tokens; each specimen's own doc comment says
 * why.
 *
 * Values are ready-made elements, matching how the illustrations map works. The
 * overview renders them inside an `inert` plate, so a specimen must never depend
 * on interaction or hold state of its own.
 *
 * `fillsPlate` rides along on the entry rather than living in a second map
 * keyed by the same routes: two structures over one key space have to be edited
 * together, and a path present in only the second one fails silently. Note it
 * is not derivable from "uses `wireframe.page`" — the Menu button specimen is a
 * hand-composed diagram too, but its subject is a control, so it sits on the
 * plate with the rest.
 */
const COMPONENT_SPECIMENS: Partial<
  Record<DesignSystemPath, ComponentSpecimen>
> = {
  "/design-system/components/text": { element: <TextSpecimen /> },
  "/design-system/components/heading": { element: <HeadingSpecimen /> },
  "/design-system/components/button": { element: <ButtonSpecimen /> },
  "/design-system/components/icon-button": { element: <IconButtonSpecimen /> },
  "/design-system/components/menu-button": { element: <MenuButtonSpecimen /> },
  "/design-system/components/chip": { element: <ChipSpecimen /> },
  "/design-system/components/breadcrumb": { element: <BreadcrumbSpecimen /> },
  "/design-system/components/badge": { element: <BadgeSpecimen /> },
  "/design-system/components/avatar": { element: <AvatarSpecimen /> },
  "/design-system/components/table": { element: <TableSpecimen /> },
  "/design-system/components/callout": { element: <CalloutSpecimen /> },
  "/design-system/components/card": { element: <CardSpecimen /> },
  "/design-system/components/section": { element: <SectionSpecimen /> },
  "/design-system/components/disclosure": { element: <DisclosureSpecimen /> },
  "/design-system/components/spinner": { element: <SpinnerSpecimen /> },
  "/design-system/components/progress": { element: <ProgressSpecimen /> },
  "/design-system/components/skeleton": { element: <SkeletonSpecimen /> },
  "/design-system/components/divider": { element: <DividerSpecimen /> },
  "/design-system/components/switch": { element: <SwitchSpecimen /> },
  "/design-system/components/text-field": { element: <TextFieldSpecimen /> },
  "/design-system/components/textarea": { element: <TextareaSpecimen /> },
  "/design-system/components/checkbox": { element: <CheckboxSpecimen /> },
  "/design-system/components/segmented-control": {
    element: <SegmentedControlSpecimen />,
  },
  "/design-system/components/select": { element: <SelectSpecimen /> },
  "/design-system/components/option-card": { element: <OptionCardSpecimen /> },
  "/design-system/components/slider": { element: <SliderSpecimen /> },
  "/design-system/components/popover": { element: <PopoverSpecimen /> },
  "/design-system/components/progressive-blur": {
    element: <ProgressiveBlurSpecimen />,
    fillsPlate: true,
  },
  "/design-system/components/overlay": {
    element: <OverlaySpecimen />,
    fillsPlate: true,
  },
  "/design-system/components/sidebar-layout": {
    element: <SidebarLayoutSpecimen />,
    fillsPlate: true,
  },
  "/design-system/components/header-footer-layout": {
    element: <HeaderFooterLayoutSpecimen />,
    fillsPlate: true,
  },
  "/design-system/examples/movie-detail": {
    element: <MovieDetailSpecimen />,
    fillsPlate: true,
  },
};

export function getComponentSpecimen(path: DesignSystemPath) {
  return COMPONENT_SPECIMENS[path];
}

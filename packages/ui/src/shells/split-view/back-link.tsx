"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import * as stylex from "@stylexjs/stylex";
import { use } from "react";
import { PlainAnchor } from "../../actions/tab-bar.tsx";
import { isPlainClick } from "../../actions/use-tab-press.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner } from "../../primitives/corner.stylex.ts";
import { typeRole } from "../../primitives/type.stylex.ts";
import { columnStyles } from "./column.stylex.ts";
import { SplitViewContext } from "./split-view-link.tsx";
import type { SplitViewBackLink } from "./types.ts";

/** @internal */
export function BackLink({
  back,
  onTakeOff,
}: {
  back: SplitViewBackLink;
  onTakeOff: (href: string) => void;
}) {
  const view = use(SplitViewContext);
  const LinkComponent = view?.linkComponent ?? PlainAnchor;
  return (
    <div css={columnStyles.back}>
      <LinkComponent
        href={back.href}
        onClick={(event) => {
          if (event.defaultPrevented || !isPlainClick(event)) return;
          event.preventDefault();
          onTakeOff(back.href);
        }}
        {...stylex.props(
          typeRole.label,
          a11y.touchTarget,
          a11y.focusRing,
          corner.radius_1,
          columnStyles.backLink,
        )}
      >
        <CaretLeftIcon weight="bold" aria-hidden />
        {back.label}
      </LinkComponent>
    </div>
  );
}

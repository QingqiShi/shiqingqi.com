"use client";

import { XIcon } from "@phosphor-icons/react/X";
import {
  useDeferredValue,
  ViewTransition,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { usePortalTarget } from "@/contexts/portal-context";
import { Button } from "./button";

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Overlay({
  children,
  isOpen,
  onClose,
}: PropsWithChildren<OverlayProps>) {
  const portalTarget = usePortalTarget();
  const deferredIsOpen = useDeferredValue(isOpen);

  if (!deferredIsOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <>
      <ViewTransition>
        <div
          className="absolute top-0 left-0 w-full h-full bg-black/70 z-tooltip pointer-events-auto"
          onClick={onClose}
        />
      </ViewTransition>
      <ViewTransition enter="slide-in" exit="slide-out">
        <RemoveScroll enabled={deferredIsOpen} allowPinchZoom forwardProps>
          <div className="absolute top-12 left-0 w-[calc(100%-var(--removed-body-scroll-bar-size,0px))] h-full surface-raised pb-12 z-tooltip rounded-2xl overflow-hidden pointer-events-auto">
            <Button
              className="absolute right-2 md:right-6 top-2 md:top-6"
              icon={<XIcon />}
              onClick={onClose}
            />
            {children}
          </div>
        </RemoveScroll>
      </ViewTransition>
    </>,
    portalTarget,
  );
}

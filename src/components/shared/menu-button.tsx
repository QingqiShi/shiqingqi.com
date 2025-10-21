"use client";

import type { PropsWithChildren } from "react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { AnimateToTarget } from "./animate-to-target";
import { Button } from "./button";
import { FixedContainerContent } from "./fixed-container-content";

interface MenuButtonProps {
  /** Button prop overrides */
  buttonProps: Partial<ComponentProps<typeof Button>>;
  /** The node to render into the expanded menu. */
  menuContent: ReactNode;
  /** Where to expand from. */
  position?:
    | "topRight"
    | "topLeft"
    | "bottomLeft"
    | "bottomRight"
    | "viewportWidth";
  /** Disable the menu trigger. */
  disabled?: boolean;
}

/** A button that expands into a menu. */
export function MenuButton({
  children,
  buttonProps,
  menuContent,
  position = "topRight",
  disabled,
}: PropsWithChildren<MenuButtonProps>) {
  const [isMenuShown, setIsMenuShown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const outsideClicked = useRef(false);
  useEffect(() => {
    if (isMenuShown) {
      outsideClicked.current = false;
    }
  }, [isMenuShown]);

  const targetId = useId();

  const positionClasses = {
    topRight: "top-0 right-0",
    topLeft: "top-0 left-0",
    bottomLeft: "bottom-0 left-0",
    bottomRight: "bottom-0 right-0",
    viewportWidth:
      "fixed left-2 right-2 -translate-y-[40px] md:-translate-y-[32px]",
  };

  return (
    <>
      {isMenuShown && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-overlay"
          onClick={() => {
            if (isMenuShown) {
              setIsMenuShown(false);
              outsideClicked.current = true;
            }
          }}
        />
      )}
      <div
        className="relative inline-block"
        ref={containerRef}
        onBlur={(e) => {
          if (
            isMenuShown &&
            !containerRef.current?.contains(e.currentTarget) &&
            !outsideClicked.current
          ) {
            setIsMenuShown(false);
          }
        }}
      >
        <FixedContainerContent>
          <Button
            {...buttonProps}
            onClick={() => setIsMenuShown(true)}
            disabled={disabled}
            id={targetId}
            labelId={`${targetId}-label`}
          >
            {children && <span>{children}</span>}
          </Button>
        </FixedContainerContent>
        <div
          className={cn(
            "absolute z-overlay rounded-2xl",
            !isMenuShown && "pointer-events-none",
            positionClasses[position],
          )}
        >
          <AnimateToTarget
            className="surface-raised shadow-2xl rounded-2xl overflow-hidden"
            animateToTarget={!isMenuShown}
            targetId={targetId}
          >
            <div>
              {children && (
                <div className="text-base px-3 py-2 pb-1 text-gray-11 dark:text-grayDark-11">
                  {children}
                </div>
              )}
              {menuContent}
            </div>
          </AnimateToTarget>
        </div>
      </div>
    </>
  );
}

"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type AnimationEvent,
  type ComponentProps,
  type ComponentType,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

/**
 * What a link status component takes. `tab-view.tsx` exports it to the package.
 *
 * @internal
 */
export interface TabLinkStatusProps {
  /** Call it with whether the router's navigation to this link is pending. */
  children: (pending: boolean) => ReactNode;
}

/**
 * How long a switch waits for the new screen before the skeleton shows. A
 * screen that the router holds renders in less time, so it shows no skeleton.
 */
const SKELETON_DELAY_MS = 100;

function isCurrentUrl(href: string) {
  const { pathname, search } = new URL(href, location.href);
  return pathname === location.pathname && search === location.search;
}

function OpeningReporter({
  href,
  pending,
  setOpening,
}: {
  href: string;
  pending: boolean;
  setOpening: Dispatch<SetStateAction<string | null>>;
}) {
  useLayoutEffect(() => {
    if (pending && !isCurrentUrl(href)) {
      setOpening(href);
    } else {
      setOpening((opening) => (opening === href ? null : opening));
    }
  }, [pending, href, setOpening]);
  // A link in the page goes in the commit that ends its navigation. Thus it
  // never reports the end.
  useLayoutEffect(
    () => () => {
      setOpening((opening) => (opening === href ? null : opening));
    },
    [href, setOpening],
  );
  return null;
}

/** The props that a view hands a link of its link Slot. */
interface ViewLinkProps extends ComponentProps<"a"> {
  href: string;
}

interface StatusLinkProps extends ViewLinkProps {
  linkComponent: ComponentType<ViewLinkProps>;
  linkStatus: ComponentType<TabLinkStatusProps> | null;
  setOpening: Dispatch<SetStateAction<string | null>>;
}

/**
 * A link of a view's link Slot that tells the view while the router's
 * navigation to it is pending.
 *
 * @internal
 */
export function StatusLink({
  linkComponent: LinkComponent,
  linkStatus: LinkStatus,
  setOpening,
  children,
  ...props
}: StatusLinkProps) {
  return (
    <LinkComponent {...props}>
      {children}
      {LinkStatus === null ? null : (
        <LinkStatus>
          {(pending) => (
            <OpeningReporter
              href={props.href}
              pending={pending}
              setOpening={setOpening}
            />
          )}
        </LinkStatus>
      )}
    </LinkComponent>
  );
}

/**
 * The destination that opens, and the one whose skeleton shows, which is the
 * one that opens once it has taken `SKELETON_DELAY_MS`. `other` is a
 * destination that opens with no link to report it, such as one the view
 * replaces the history entry with.
 *
 * @internal
 */
export function useOpeningScreen(other: string | null = null) {
  const [reported, setReported] = useState<string | null>(null);
  const opening = reported ?? other;
  const [slow, setSlow] = useState<string | null>(null);
  if (opening === null && slow !== null) setSlow(null);
  useEffect(() => {
    if (opening === null) return;
    const timer = setTimeout(() => {
      setSlow(opening);
    }, SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [opening]);
  return {
    opening,
    setOpening: setReported,
    skeletonHref: slow === opening ? opening : null,
  };
}

/**
 * Whether the screen fades in now, which it does each time its skeleton goes.
 *
 * @internal
 */
export function useReveal(hidden: boolean) {
  const [wasHidden, setWasHidden] = useState(hidden);
  const [revealing, setRevealing] = useState(false);
  if (hidden !== wasHidden) {
    setWasHidden(hidden);
    setRevealing(!hidden);
  }
  return {
    revealing,
    onAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) setRevealing(false);
    },
  };
}

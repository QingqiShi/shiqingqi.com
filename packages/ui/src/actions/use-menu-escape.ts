import {
  useEffect,
  useEffectEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";

interface MenuEscapeOptions {
  containerRef: RefObject<HTMLElement | null>;
  isMenuShown: boolean;
  close: () => void;
}

/**
 * The Escape key of an open menu. The handler that comes back is for the
 * `onKeyDown` of the container, and is true for a key that it used.
 *
 * A key that closes the menu is marked as used with `preventDefault`.
 * `stopPropagation` alone does not stop a listener on the document where the
 * document is the React root, as in a Next app. Such a listener, for example
 * the keys of a `NavigationSplitView` that take its detail off, reads
 * `defaultPrevented`.
 *
 * Safari leaves focus on an ancestor of the menu, or on nothing, after a press
 * on the trigger or on a control in the popup. An Escape then starts above the
 * container, and the handler does not get it. A listener on the document
 * takes it in the capture phase, which comes before the listeners that take
 * a detail off.
 *
 * @internal
 */
export function useMenuEscape({
  containerRef,
  isMenuShown,
  close,
}: MenuEscapeOptions) {
  const closeFromAbove = useEffectEvent((event: KeyboardEvent) => {
    const container = containerRef.current;
    const { target } = event;
    if (event.key !== "Escape" || event.defaultPrevented || !container) return;
    if (!(target instanceof Node) || target === container) return;
    if (!target.contains(container)) return;
    event.preventDefault();
    event.stopPropagation();
    close();
  });
  useEffect(() => {
    if (!isMenuShown) return;
    const listener = (event: KeyboardEvent) => {
      closeFromAbove(event);
    };
    document.addEventListener("keydown", listener, true);
    return () => {
      document.removeEventListener("keydown", listener, true);
    };
  }, [isMenuShown]);

  return (event: ReactKeyboardEvent) => {
    if (event.key !== "Escape" || !isMenuShown) return false;
    event.preventDefault();
    event.stopPropagation();
    close();
    return true;
  };
}

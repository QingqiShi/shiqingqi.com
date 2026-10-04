"use client";

import type { ReactNode } from "react";
import { EffectScopeContext } from "./effect-scope-context.ts";
import type { EffectContainerRef } from "./use-effect-container.ts";

export interface EffectContainerProps {
  /**
   * The ref from `useEffectContainer`, attached to the container element.
   * The effect hooks inside take the scope it holds.
   *
   * @zh `useEffectContainer` 返回的 ref，挂在容器元素上。里面的效果 hook 会进入它所持有的作用域。
   */
  value: EffectContainerRef;
  /**
   * The content of the container. Each effect hook in it, at any depth, is
   * in the container's scope, also when its element is portalled out.
   *
   * @zh 容器的内容。其中任意层级的效果 hook 都属于该容器的作用域，即使它的元素被传送到容器之外。
   */
  children: ReactNode;
}

/**
 * Puts the effect hooks inside it in the scope of an Effect container, so
 * they act only on each other and draw only inside the container. Render it
 * inside the element that takes the container's ref:
 *
 * ```tsx
 * const container = useEffectContainer();
 * return (
 *   <section ref={container}>
 *     <EffectContainer value={container}>{children}</EffectContainer>
 *   </section>
 * );
 * ```
 */
export function EffectContainer({ value, children }: EffectContainerProps) {
  return (
    <EffectScopeContext value={value.scope}>{children}</EffectScopeContext>
  );
}

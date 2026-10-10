/**
 * The range of `instances` whose elements are in a target's range of
 * `EffectFrame.elements`, as `[first, count]`.
 *
 * @internal
 */
export function instanceRange(
  instances: readonly { readonly elementIndex: number }[],
  firstElement: number,
  elementCount: number,
): readonly [number, number] {
  const indexFrom = (element: number) => {
    const index = instances.findIndex(
      ({ elementIndex }) => elementIndex >= element,
    );
    return index === -1 ? instances.length : index;
  };
  const first = indexFrom(firstElement);
  return [first, indexFrom(firstElement + elementCount) - first];
}

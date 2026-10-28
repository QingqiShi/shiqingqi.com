import { fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { useEffectBoundary } from "./use-effect-boundary.ts";

function renderWithRegistry(children: ReactNode) {
  const registry = createEffectRegistry();
  const result = render(
    <EffectLayerContext value={registry}>{children}</EffectLayerContext>,
  );
  const registered = () => [...registry.elements().keys()];
  return { ...result, registered };
}

describe("useEffectBoundary", () => {
  it("registers the element its ref is attached to, and lets it go on unmount", () => {
    function Row() {
      const ref = useEffectBoundary();
      return (
        <ul>
          <li ref={ref} data-testid="row" />
        </ul>
      );
    }
    const { registered, unmount } = renderWithRegistry(<Row />);
    expect(registered()).toEqual([screen.getByTestId("row")]);
    unmount();
    expect(registered()).toEqual([]);
  });

  it("follows the element when React replaces it", () => {
    function Swap() {
      const ref = useEffectBoundary();
      const [isList, setIsList] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setIsList(true);
            }}
          >
            Swap
          </button>
          {isList ? (
            <ul ref={ref} data-testid="next" />
          ) : (
            <div ref={ref} data-testid="first" />
          )}
        </>
      );
    }
    const { registered } = renderWithRegistry(<Swap />);
    expect(registered()).toEqual([screen.getByTestId("first")]);

    fireEvent.click(screen.getByRole("button"));
    expect(registered()).toEqual([screen.getByTestId("next")]);
  });

  it("does nothing outside a provider", () => {
    function Card() {
      const ref = useEffectBoundary();
      return <div ref={ref} data-testid="card" />;
    }
    render(<Card />);
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });
});

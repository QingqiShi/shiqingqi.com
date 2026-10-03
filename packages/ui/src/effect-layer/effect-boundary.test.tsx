import { render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { EffectBoundary } from "./effect-boundary.tsx";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { useEffectBoundary } from "./use-effect-boundary.ts";

function renderWithRegistry(children: ReactNode) {
  const registry = createEffectRegistry();
  const result = render(
    <EffectLayerContext value={registry.register}>
      {children}
    </EffectLayerContext>,
  );
  const registered = () => [...registry.elements().keys()];
  return { ...result, registry, registered };
}

describe("EffectBoundary", () => {
  it("registers its child element", () => {
    const { registered } = renderWithRegistry(
      <EffectBoundary>
        <div data-testid="card" />
      </EffectBoundary>,
    );
    const card = screen.getByTestId("card");
    expect(registered()).toEqual([card]);
  });

  it("registers one element through nested boundaries", () => {
    const { registered } = renderWithRegistry(
      <EffectBoundary>
        <EffectBoundary>
          <div data-testid="card" />
        </EffectBoundary>
      </EffectBoundary>,
    );
    expect(registered()).toEqual([screen.getByTestId("card")]);
  });

  it("follows the child when React replaces it", async () => {
    function Swap() {
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
          <EffectBoundary>
            {isList ? <ul data-testid="next" /> : <div data-testid="first" />}
          </EffectBoundary>
        </>
      );
    }
    const { registered } = renderWithRegistry(<Swap />);
    expect(registered()).toEqual([screen.getByTestId("first")]);

    screen.getByRole("button").click();
    const next = await screen.findByTestId("next");
    await waitFor(() => {
      expect(registered()).toEqual([next]);
    });
  });

  it("removes its element when it unmounts", () => {
    const { registered, unmount } = renderWithRegistry(
      <EffectBoundary>
        <div />
      </EffectBoundary>,
    );
    expect(registered()).toHaveLength(1);
    unmount();
    expect(registered()).toEqual([]);
  });

  it("renders its child and nothing more outside a provider", () => {
    render(
      <EffectBoundary>
        <div data-testid="card" />
      </EffectBoundary>,
    );
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });
});

describe("useEffectBoundary", () => {
  it("registers the element its ref is attached to", () => {
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
});

describe("createEffectRegistry", () => {
  it("merges the registrations of one element and notifies on change", () => {
    const registry = createEffectRegistry();
    const element = document.createElement("div");
    let notified = 0;
    registry.subscribe(() => {
      notified += 1;
    });
    const removeFirst = registry.register(element, 0b01);
    const removeSecond = registry.register(element, 0b10);
    const { id } = registry.elements().get(element) ?? { id: 0 };
    expect(registry.elements().get(element)).toEqual({ id, roles: 0b11 });
    expect(registry.getRoles()).toBe(0b11);

    removeFirst();
    removeFirst();
    expect(registry.elements().get(element)).toEqual({ id, roles: 0b10 });
    removeSecond();
    expect(registry.elements().size).toBe(0);
    expect(registry.getRoles()).toBe(0);
    expect(notified).toBe(5);
  });

  it("gives an element a new id when it registers again", () => {
    const registry = createEffectRegistry();
    const element = document.createElement("div");
    const remove = registry.register(element, 0);
    const first = registry.elements().get(element)?.id;
    remove();
    registry.register(element, 0);
    expect(registry.elements().get(element)?.id).not.toBe(first);
  });
});

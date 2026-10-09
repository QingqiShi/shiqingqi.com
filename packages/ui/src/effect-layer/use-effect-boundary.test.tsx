import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { mergeRefs } from "../merge-refs.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { EffectContainer } from "./effect-container.tsx";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { roleBits } from "./effect-roles.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { useBlackHole } from "./use-black-hole.ts";
import { useDust } from "./use-dust.ts";
import { useEffectBoundary } from "./use-effect-boundary.ts";
import { useEffectContainer } from "./use-effect-container.ts";
import { useExtractorFan } from "./use-extractor-fan.ts";
import { useLightBeam } from "./use-light-beam.ts";
import { useLiquidThumb } from "./use-liquid-thumb.ts";
import { useRipple } from "./use-ripple.ts";

const ON_PAGE = { scope: PAGE_SCOPE, holds: null };

function renderWithRegistry(children: ReactNode) {
  const registry = createEffectRegistry();
  const result = render(
    <EffectLayerContext value={registry.register}>
      {children}
    </EffectLayerContext>,
  );
  const registered = () => [...registry.elements().keys()];
  const entry = (testId: string) =>
    registry.elements().get(screen.getByTestId(testId));
  return { ...result, registry, registered, entry };
}

describe("useEffectBoundary", () => {
  it("registers the element its ref is attached to, with no role", () => {
    function Row() {
      const ref = useEffectBoundary();
      return (
        <ul>
          <li ref={ref} data-testid="row" />
        </ul>
      );
    }
    const { registered, entry, unmount } = renderWithRegistry(<Row />);
    expect(registered()).toEqual([screen.getByTestId("row")]);
    expect(entry("row")).toMatchObject({ roles: 0, settings: {} });
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

describe("effect hooks", () => {
  it("register their element with their role and their settings", () => {
    function Elements() {
      const ripple = useRipple({ ambient: true });
      const dust = useDust({ density: 5 });
      const fan = useExtractorFan();
      const lightBeam = useLightBeam();
      const liquid = useLiquidThumb({ position: 1 });
      return (
        <>
          <div ref={ripple} data-testid="ripple" />
          <div ref={dust} data-testid="dust" />
          <div ref={fan} data-testid="fan" />
          <div ref={lightBeam} data-testid="beam" />
          <div ref={liquid.ref} data-testid="liquid" />
        </>
      );
    }
    const { entry } = renderWithRegistry(<Elements />);
    expect(entry("ripple")).toMatchObject({
      roles: roleBits(["ripple", "rippleAmbient"]),
      settings: {},
    });
    expect(entry("dust")).toMatchObject({
      roles: roleBits(["dust"]),
      settings: { dust: { density: 5 } },
    });
    expect(entry("fan")).toMatchObject({
      roles: roleBits(["extractorFan"]),
      settings: { extractorFan: { reach: 400 } },
    });
    expect(entry("beam")).toMatchObject({
      roles: roleBits(["lightBeam"]),
      settings: { lightBeam: { angle: undefined, followsPointer: true } },
    });
    expect(entry("liquid")).toMatchObject({
      roles: roleBits(["liquidThumb"]),
      settings: { liquidThumb: { position: 1, drag: null } },
    });
  });

  it("merge the roles and settings of one element with two hooks", () => {
    function Lamp() {
      const blackHole = useBlackHole({ mass: 2 });
      const lightBeam = useLightBeam({ angle: 45, followsPointer: false });
      return <div ref={mergeRefs(blackHole, lightBeam)} data-testid="lamp" />;
    }
    const { registered, entry, unmount } = renderWithRegistry(<Lamp />);
    expect(registered()).toHaveLength(1);
    expect(entry("lamp")).toMatchObject({
      roles: roleBits(["blackHole", "lightBeam"]),
      settings: {
        blackHole: { mass: 2 },
        lightBeam: { angle: 45, followsPointer: false },
      },
    });
    unmount();
    expect(registered()).toEqual([]);
  });

  it("take new settings and roles and keep the element's id", () => {
    function Controlled({ mass, ambient }: { mass: number; ambient: boolean }) {
      const blackHole = useBlackHole({ mass });
      const ripple = useRipple({ ambient });
      // React Compiler caches the merged ref like this. Vitest does not run
      // React Compiler.
      const ref = useMemo(
        () => mergeRefs(blackHole, ripple),
        [blackHole, ripple],
      );
      return <div ref={ref} data-testid="element" />;
    }
    const { entry, rerender, registry } = renderWithRegistry(
      <Controlled mass={1} ambient={false} />,
    );
    const { id } = entry("element") ?? { id: 0 };
    let notified = 0;
    registry.subscribe(() => {
      notified += 1;
    });

    rerender(
      <EffectLayerContext value={registry.register}>
        <Controlled mass={3} ambient />
      </EffectLayerContext>,
    );
    expect(entry("element")).toEqual({
      id,
      roles: roleBits(["blackHole", "ripple", "rippleAmbient"]),
      settings: { blackHole: { mass: 3 } },
      scope: 0,
      holds: null,
    });
    expect(notified).toBeGreaterThan(0);
  });
});

describe("useEffectContainer", () => {
  function Fan({ testId = "fan" }: { testId?: string }) {
    const ref = useExtractorFan();
    return <div ref={ref} data-testid={testId} />;
  }

  it("puts the effect hooks inside its EffectContainer in its scope, also when they register first", () => {
    function Card() {
      const container = useEffectContainer();
      const dust = useDust();
      const ref = useMemo(() => mergeRefs(container, dust), [container, dust]);
      return (
        <section ref={ref} data-testid="card">
          <EffectContainer value={container}>
            <Fan />
          </EffectContainer>
          <Fan testId="outside" />
        </section>
      );
    }
    const { registered, entry } = renderWithRegistry(<Card />);
    expect(registered()).toEqual([
      screen.getByTestId("fan"),
      screen.getByTestId("outside"),
      screen.getByTestId("card"),
    ]);
    const holds = entry("card")?.holds;
    expect(holds).toBeGreaterThan(0);
    expect(entry("card")).toMatchObject({
      roles: roleBits(["dust"]),
      scope: 0,
    });
    expect(entry("fan")).toMatchObject({ scope: holds, holds: null });
    expect(entry("outside")).toMatchObject({ scope: 0 });
  });

  it("puts a container inside another in the outer one's scope", () => {
    function Card({ children }: { children: ReactNode }) {
      const container = useEffectContainer();
      return (
        <section ref={container} data-testid={children ? "outer" : "inner"}>
          <EffectContainer value={container}>{children}</EffectContainer>
        </section>
      );
    }
    const { entry } = renderWithRegistry(
      <Card>
        <Card>{null}</Card>
      </Card>,
    );
    expect(entry("inner")?.scope).toBe(entry("outer")?.holds);
    expect(entry("inner")?.holds).not.toBe(entry("outer")?.holds);
  });

  it("moves an element to the scope of the new context value, and keeps its id", () => {
    function Cards({ inSecond }: { inSecond: boolean }) {
      const first = useEffectContainer();
      const second = useEffectContainer();
      return (
        <>
          <section ref={first} data-testid="first" />
          <section ref={second} data-testid="second" />
          <EffectContainer value={inSecond ? second : first}>
            <Fan />
          </EffectContainer>
        </>
      );
    }
    const { entry, rerender, registry } = renderWithRegistry(
      <Cards inSecond={false} />,
    );
    const { id } = entry("fan") ?? { id: 0 };
    expect(entry("fan")?.scope).toBe(entry("first")?.holds);

    rerender(
      <EffectLayerContext value={registry.register}>
        <Cards inSecond />
      </EffectLayerContext>,
    );
    expect(entry("fan")).toMatchObject({ id, scope: entry("second")?.holds });
  });

  it("leaves the scope with its registration", () => {
    function Card({ open }: { open: boolean }) {
      const container = useEffectContainer();
      return (
        <section ref={container} data-testid="card">
          {open && (
            <EffectContainer value={container}>
              <Fan />
            </EffectContainer>
          )}
        </section>
      );
    }
    const { registered, rerender, registry, unmount } = renderWithRegistry(
      <Card open />,
    );
    expect(registered()).toHaveLength(2);
    rerender(
      <EffectLayerContext value={registry.register}>
        <Card open={false} />
      </EffectLayerContext>,
    );
    expect(registered()).toEqual([screen.getByTestId("card")]);
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
    const first = registry.register(element, 0b01, {}, ON_PAGE);
    const second = registry.register(element, 0b10, {}, ON_PAGE);
    const { id } = registry.elements().get(element) ?? { id: 0 };
    expect(registry.elements().get(element)).toEqual({
      id,
      roles: 0b11,
      settings: {},
      scope: 0,
      holds: null,
    });
    expect(registry.getRoles()).toBe(0b11);

    first.remove();
    first.remove();
    expect(registry.elements().get(element)).toEqual({
      id,
      roles: 0b10,
      settings: {},
      scope: 0,
      holds: null,
    });
    second.remove();
    expect(registry.elements().size).toBe(0);
    expect(registry.getRoles()).toBe(0);
    expect(notified).toBe(4);
  });

  it("takes each effect's settings from the latest registration with them", () => {
    const registry = createEffectRegistry();
    const element = document.createElement("div");
    const first = registry.register(
      element,
      0,
      { blackHole: { mass: 1 } },
      ON_PAGE,
    );
    registry.register(element, 0, { dust: { density: 2 } }, ON_PAGE);
    const third = registry.register(
      element,
      0,
      { blackHole: { mass: 3 } },
      ON_PAGE,
    );
    expect(registry.elements().get(element)?.settings).toEqual({
      blackHole: { mass: 3 },
      dust: { density: 2 },
    });

    third.remove();
    expect(registry.elements().get(element)?.settings).toEqual({
      blackHole: { mass: 1 },
      dust: { density: 2 },
    });
    first.update(0, { blackHole: { mass: 4 } }, 0);
    expect(registry.elements().get(element)?.settings.blackHole).toEqual({
      mass: 4,
    });
  });

  it("does not notify when settings change to equal values", () => {
    const registry = createEffectRegistry();
    const element = document.createElement("div");
    const registration = registry.register(
      element,
      0,
      {
        blackHole: { mass: 1 },
      },
      ON_PAGE,
    );
    let notified = 0;
    registry.subscribe(() => {
      notified += 1;
    });
    registration.update(0, { blackHole: { mass: 1 } }, 0);
    expect(notified).toBe(0);
    registration.update(0, { blackHole: { mass: 2 } }, 0);
    expect(notified).toBe(1);
  });

  it("forgets an element as soon as its last registration goes", () => {
    const registry = createEffectRegistry();
    const element = document.createElement("div");
    const first = registry.register(element, 0, {}, ON_PAGE);
    const id = registry.elements().get(element)?.id;
    let notified = 0;
    registry.subscribe(() => {
      notified += 1;
    });
    first.remove();
    expect(registry.elements().size).toBe(0);
    registry.register(element, 0, {}, ON_PAGE);
    expect(registry.elements().get(element)?.id).not.toBe(id);
    expect(notified).toBe(2);
  });
});

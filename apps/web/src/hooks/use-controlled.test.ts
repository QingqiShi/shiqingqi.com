import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useControlled } from "./use-controlled";

describe("useControlled", () => {
  it("returns the default value when uncontrolled", () => {
    const { result } = renderHook(() =>
      useControlled({ controlled: undefined, defaultValue: "off" }),
    );

    expect(result.current[0]).toBe("off");
  });

  it("updates internal state when uncontrolled", () => {
    const { result } = renderHook(() =>
      useControlled({ controlled: undefined, defaultValue: "off" }),
    );

    act(() => {
      result.current[1]("on");
    });

    expect(result.current[0]).toBe("on");
  });

  it("returns the controlled value when controlled", () => {
    const { result } = renderHook(() =>
      useControlled({ controlled: "on", defaultValue: "off" }),
    );

    expect(result.current[0]).toBe("on");
  });

  it("ignores setValue when controlled", () => {
    const { result } = renderHook(() =>
      useControlled({ controlled: "on", defaultValue: "off" }),
    );

    act(() => {
      result.current[1]("off");
    });

    // Value should still be the controlled value
    expect(result.current[0]).toBe("on");
  });

  it("reflects updated controlled value on re-render", () => {
    const { result, rerender } = renderHook(
      ({ controlled }: { controlled: string | undefined }) =>
        useControlled({ controlled, defaultValue: "off" }),
      { initialProps: { controlled: "on" } },
    );

    expect(result.current[0]).toBe("on");

    rerender({ controlled: "indeterminate" });

    expect(result.current[0]).toBe("indeterminate");
  });

  it("works with non-string types", () => {
    const { result } = renderHook(() =>
      useControlled({ controlled: undefined, defaultValue: 0 }),
    );

    expect(result.current[0]).toBe(0);

    act(() => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
  });
});

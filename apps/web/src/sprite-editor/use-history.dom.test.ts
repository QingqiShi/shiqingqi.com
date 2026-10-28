import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHistory } from "./use-history";

describe("useHistory", () => {
  it("coalesces a stroke between two discrete pushes", () => {
    const { result } = renderHook(() => useHistory("a"));

    // Discrete edit before the stroke.
    act(() => {
      result.current.push("b");
    });
    // Stroke: one push + several replaces.
    act(() => {
      result.current.push("c1");
    });
    act(() => {
      result.current.replace("c2");
    });
    act(() => {
      result.current.replace("c3");
    });
    // Discrete edit after the stroke.
    act(() => {
      result.current.push("d");
    });

    expect(result.current.present).toBe("d");

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe("c3");

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe("b");

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe("a");
    expect(result.current.canUndo).toBe(false);
  });

  it("redo restores the value present at the time of undo, including the final stroke frame", () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.replace(2);
    });
    act(() => {
      result.current.replace(3);
    });

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe(0);

    act(() => {
      result.current.redo();
    });
    expect(result.current.present).toBe(3);
    expect(result.current.canRedo).toBe(false);
  });

  it("replace clears the redo stack just like push", () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.push(2);
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.replace(99);
    });
    expect(result.current.present).toBe(99);
    expect(result.current.canRedo).toBe(false);
  });
});

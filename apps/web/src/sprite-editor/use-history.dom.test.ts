import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHistory } from "./use-history";

describe("useHistory", () => {
  it("starts with the initial value and no history", () => {
    const { result } = renderHook(() => useHistory(0));

    expect(result.current.present).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("push appends entries that can be undone one by one", () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.push(2);
    });
    act(() => {
      result.current.push(3);
    });

    expect(result.current.present).toBe(3);

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe(2);

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe(1);

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it("replace updates present without growing past — drag-style coalescing", () => {
    const { result } = renderHook(() => useHistory(0));

    // Simulate a pencil stroke: pointer-down pushes the first frame, every
    // subsequent pointer-move replaces in place. The whole stroke must be
    // undoable in a single Ctrl+Z.
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
      result.current.replace(4);
    });

    expect(result.current.present).toBe(4);

    act(() => {
      result.current.undo();
    });
    expect(result.current.present).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

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
    expect(result.current.present).toBe(1);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.replace(99);
    });
    expect(result.current.present).toBe(99);
    expect(result.current.canRedo).toBe(false);
  });

  it("reset wipes history to a single entry", () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => {
      result.current.push(1);
    });
    act(() => {
      result.current.push(2);
    });
    act(() => {
      result.current.reset(42);
    });

    expect(result.current.present).toBe(42);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

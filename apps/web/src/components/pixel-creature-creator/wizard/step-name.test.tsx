import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#src/test-utils.tsx";
import { type CreatureDef, DEFAULT_CREATURE } from "../state/creature-schema";
import { StepName } from "./step-name";

function renderStep(name: string) {
  const def: CreatureDef = { ...DEFAULT_CREATURE, name };
  const onChange = vi.fn<(next: CreatureDef) => void>();
  const result = render(<StepName def={def} onChange={onChange} />);
  const input = screen.getByTestId("creature-name-input");
  return { ...result, input, onChange };
}

describe("StepName accessibility wiring", () => {
  it("marks the input as required", () => {
    const { input } = renderStep("Mochi");
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("ties aria-describedby to the visible hint paragraph", () => {
    const { input } = renderStep("Mochi");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    if (describedBy === null) return;

    // Every id listed in aria-describedby resolves to a real element.
    const ids = describedBy.split(/\s+/).filter((id) => id.length > 0);
    expect(ids.length).toBeGreaterThanOrEqual(1);
    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull();
    }

    // One of those elements is the constraint hint with the bilingual copy.
    const hintEl = ids
      .map((id) => document.getElementById(id))
      .find((el) => el !== null && el.textContent.includes("1–20"));
    expect(hintEl).not.toBeUndefined();
  });

  it("flips aria-invalid to true when the trimmed name is empty", () => {
    const { input } = renderStep("");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("treats whitespace-only names as empty", () => {
    const { input } = renderStep("   ");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("flips aria-invalid back to false once the user types a real character", () => {
    const { input } = renderStep("Mochi");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("includes the error message id in aria-describedby when invalid", () => {
    const { input } = renderStep("");
    const error = screen.getByTestId("creature-name-error");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(describedBy?.split(/\s+/)).toContain(error.id);
    expect(error.textContent).not.toBe("");
  });

  it("excludes the error message id from aria-describedby when valid", () => {
    const { input } = renderStep("Mochi");
    const error = screen.getByTestId("creature-name-error");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(describedBy?.split(/\s+/)).not.toContain(error.id);
    // The live region stays mounted for stable announcements but its body is
    // empty when the field is valid.
    expect(error.textContent).toBe("");
  });

  it("propagates typed values back to the parent via onChange", () => {
    const { input, onChange } = renderStep("");
    fireEvent.change(input, { target: { value: "Mochi" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Mochi" }),
    );
  });

  it("clamps input to the schema's max length", () => {
    const { input, onChange } = renderStep("");
    // 25 chars; schema cap is 20.
    fireEvent.change(input, { target: { value: "abcdefghijklmnopqrstuvwxy" } });
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    if (lastCall === undefined) return;
    const [next] = lastCall;
    expect(next.name.length).toBeLessThanOrEqual(20);
  });
});

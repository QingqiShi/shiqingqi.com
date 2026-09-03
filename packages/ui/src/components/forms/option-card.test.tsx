import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useRadioGroup } from "../../hooks/use-radio-group.ts";
import { OptionCard, OptionCardGroup } from "./option-card.tsx";

type Plan = "plan1" | "plan2" | "plan5";

const PLANS = [
  { value: "plan1", label: "Plan 1", description: "Started before 2012" },
  { value: "plan2", label: "Plan 2", description: "Started 2012 to 2023" },
  { value: "plan5", label: "Plan 5", description: "Started 2023 or later" },
] as const;

const EXTRAS = [
  { value: "grant", label: "Maintenance grant" },
  { value: "bursary", label: "Bursary" },
] as const;

function SingleHarness({
  initial = "plan1",
  onChange,
}: {
  initial?: Plan;
  onChange?: (next: Plan) => void;
}) {
  const [value, setValue] = useState<Plan>(initial);
  return (
    <OptionCardGroup
      aria-label="Repayment plan"
      options={PLANS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function MultipleHarness() {
  const [value, setValue] = useState<("grant" | "bursary")[]>([]);
  return (
    <OptionCardGroup
      selection="multiple"
      aria-label="Extra funding"
      options={EXTRAS}
      value={value}
      onChange={setValue}
    />
  );
}

describe("OptionCardGroup", () => {
  it("renders a named radiogroup of radio options", () => {
    render(<SingleHarness />);

    expect(
      screen.getByRole("radiogroup", { name: "Repayment plan" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("names the group from aria-labelledby", () => {
    render(
      <>
        <h2 id="plan-heading">Which plan are you on?</h2>
        <OptionCardGroup
          aria-labelledby="plan-heading"
          options={PLANS}
          value="plan1"
          onChange={vi.fn()}
        />
      </>,
    );

    expect(
      screen.getByRole("radiogroup", { name: "Which plan are you on?" }),
    ).toBeInTheDocument();
  });

  it("exposes selection through aria-checked", () => {
    render(<SingleHarness initial="plan2" />);

    expect(screen.getByRole("radio", { name: "Plan 1" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("radio", { name: "Plan 2" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("selects a card on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SingleHarness onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Plan 5" }));

    expect(onChange).toHaveBeenCalledWith("plan5");
    expect(screen.getByRole("radio", { name: "Plan 5" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("moves selection with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<SingleHarness />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Plan 1" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");

    const plan2 = screen.getByRole("radio", { name: "Plan 2" });
    expect(plan2).toHaveAttribute("aria-checked", "true");
    expect(plan2).toHaveFocus();

    await user.keyboard("{End}");

    expect(screen.getByRole("radio", { name: "Plan 5" })).toHaveFocus();
  });

  it("keeps only the selected card in the tab sequence", () => {
    render(<SingleHarness initial="plan5" />);

    expect(screen.getByRole("radio", { name: "Plan 1" })).toHaveAttribute(
      "tabIndex",
      "-1",
    );
    expect(screen.getByRole("radio", { name: "Plan 5" })).toHaveAttribute(
      "tabIndex",
      "0",
    );
  });

  it("describes a card by its description rather than naming it", () => {
    render(<SingleHarness />);

    // The description would otherwise be read as part of the card's name,
    // making every option announce a paragraph.
    expect(
      screen.getByRole("radio", { name: "Plan 2" }),
    ).toHaveAccessibleDescription("Started 2012 to 2023");
  });

  it("keeps a decorative icon out of the card's accessible name", () => {
    render(
      <OptionCardGroup
        aria-label="Repayment plan"
        options={[
          { value: "plan1", label: "Plan 1", icon: <span>★</span> },
          { value: "plan2", label: "Plan 2" },
        ]}
        value="plan1"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: "Plan 1" })).toBeInTheDocument();
    expect(screen.getByText("★")).toBeInTheDocument();
  });

  it("toggles multi-select cards independently", async () => {
    const user = userEvent.setup();
    render(<MultipleHarness />);

    expect(
      screen.getByRole("group", { name: "Extra funding" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Bursary" }));

    expect(screen.getByRole("checkbox", { name: "Bursary" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByRole("checkbox", { name: "Maintenance grant" }),
    ).toHaveAttribute("aria-checked", "false");

    await user.click(
      screen.getByRole("checkbox", { name: "Maintenance grant" }),
    );

    for (const card of screen.getAllByRole("checkbox")) {
      expect(card).toHaveAttribute("aria-checked", "true");
    }
  });

  it("unchecks a multi-select card on a second click", async () => {
    const user = userEvent.setup();
    render(<MultipleHarness />);

    await user.click(screen.getByRole("checkbox", { name: "Bursary" }));
    await user.click(screen.getByRole("checkbox", { name: "Bursary" }));

    expect(screen.getByRole("checkbox", { name: "Bursary" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("keeps every multi-select card in the tab sequence", async () => {
    const user = userEvent.setup();
    render(<MultipleHarness />);

    await user.tab();
    expect(
      screen.getByRole("checkbox", { name: "Maintenance grant" }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Bursary" })).toHaveFocus();
  });

  it("does not select a disabled card", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionCardGroup
        aria-label="Repayment plan"
        options={[
          { value: "plan1", label: "Plan 1" },
          { value: "plan2", label: "Plan 2", disabled: true },
        ]}
        value="plan1"
        onChange={onChange}
      />,
    );

    const disabledCard = screen.getByRole("radio", { name: "Plan 2" });
    expect(disabledCard).toBeDisabled();

    await user.click(disabledCard);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("skips disabled cards with the arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionCardGroup
        aria-label="Repayment plan"
        options={[
          { value: "plan1", label: "Plan 1" },
          { value: "plan2", label: "Plan 2", disabled: true },
          { value: "plan5", label: "Plan 5" },
        ]}
        value="plan1"
        onChange={onChange}
      />,
    );

    await user.tab();
    await user.keyboard("{ArrowDown}");

    expect(onChange).toHaveBeenCalledWith("plan5");
  });

  it("does not submit an enclosing form", () => {
    render(
      <form>
        <OptionCardGroup
          aria-label="Repayment plan"
          options={PLANS}
          value="plan1"
          onChange={vi.fn()}
        />
      </form>,
    );

    // Without an explicit type a <button> defaults to type="submit", so
    // answering a question would submit the wizard's form.
    for (const card of screen.getAllByRole("radio")) {
      expect(card).toHaveAttribute("type", "button");
    }
  });

  it("composes a caller css override last", () => {
    const overrides = stylex.create({ grid: { opacity: 0.9 } });
    render(
      <OptionCardGroup
        aria-label="Repayment plan"
        options={PLANS}
        value="plan1"
        onChange={vi.fn()}
        css={overrides.grid}
      />,
    );

    expect(screen.getByRole("radiogroup").className).toContain(
      "overrides.grid",
    );
  });
});

describe("OptionCard", () => {
  it("renders a replacement indicator slot", () => {
    render(
      <OptionCard
        role="checkbox"
        selected
        label="Plan 2"
        indicator={<span data-testid="custom-indicator">✓✓</span>}
      />,
    );

    expect(screen.getByTestId("custom-indicator")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Plan 2" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("renders bespoke children without them naming the card", () => {
    render(
      <OptionCard
        role="radio"
        label="Plan 2"
        description="Started 2012 to 2023"
      >
        <span>£1,234 a year</span>
      </OptionCard>,
    );

    expect(screen.getByRole("radio", { name: "Plan 2" })).toBeInTheDocument();
    expect(screen.getByText("£1,234 a year")).toBeInTheDocument();
  });

  it("drives a bespoke card group from useRadioGroup", async () => {
    const user = userEvent.setup();

    function BespokeGroup() {
      const [value, setValue] = useState<Plan>("plan1");
      const { getOptionProps } = useRadioGroup({
        values: ["plan1", "plan2"],
        value,
        onChange: setValue,
      });
      return (
        <div role="radiogroup" aria-label="Repayment plan">
          {(["plan1", "plan2"] as const).map((plan) => (
            <OptionCard
              key={plan}
              {...getOptionProps(plan)}
              selected={plan === value}
              label={plan === "plan1" ? "Plan 1" : "Plan 2"}
            />
          ))}
        </div>
      );
    }

    render(<BespokeGroup />);

    await user.tab();
    await user.keyboard("{ArrowRight}");

    const plan2 = screen.getByRole("radio", { name: "Plan 2" });
    expect(plan2).toHaveAttribute("aria-checked", "true");
    expect(plan2).toHaveFocus();
  });
});

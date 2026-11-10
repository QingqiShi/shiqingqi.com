import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./select.tsx";
import { SettingRow } from "./setting-row.tsx";
import { Switch } from "./switch.tsx";
import { TextField } from "./text-field.tsx";

describe("SettingRow", () => {
  it("names and describes an unlabelled Switch at its end", () => {
    render(
      <SettingRow
        label="Send a morning report"
        description="Get the report by email each day."
        control={<Switch />}
      />,
    );

    const control = screen.getByRole("switch", {
      name: "Send a morning report",
    });
    expect(control).toHaveAccessibleDescription(
      "Get the report by email each day.",
    );
  });

  it("names an unlabelled Select at its end", () => {
    render(
      <SettingRow
        label="Language"
        control={<Select options={[{ value: "en", label: "English" }]} />}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Language" })).toBeVisible();
  });

  it("leaves a dependent field with its own label", () => {
    render(
      <SettingRow
        label="File receipts into a folder"
        description="Receipts are moved out of the inbox."
        control={<Switch />}
      >
        <TextField label="Folder name" defaultValue="Finance/Receipts" />
      </SettingRow>,
    );

    expect(
      screen.getByRole("switch", { name: "File receipts into a folder" }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Folder name" }),
    ).not.toHaveAccessibleDescription();
  });
});

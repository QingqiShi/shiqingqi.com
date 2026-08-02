import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "#src/i18n/server-locale.ts";
import { render, screen } from "#src/test-utils.tsx";
import { DocBreadcrumb } from "./doc-breadcrumb.tsx";

describe("DocBreadcrumb", () => {
  beforeEach(() => {
    setLocale("en");
  });

  // The trail itself — that the section sits between the overview and the page,
  // and that only the overview is a destination. `Breadcrumb` owns the rest.
  it("runs overview, section, page", () => {
    render(<DocBreadcrumb path="/design-system/foundations/color" />);

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Design system", "Foundations", "Colour"]);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Design system" })).toHaveAttribute(
      "href",
      "/design-system",
    );
  });

  it("localizes the root crumb and its destination", () => {
    setLocale("zh");
    render(<DocBreadcrumb path="/design-system/components/chip" />);

    expect(
      screen.getByRole("navigation", { name: "面包屑导航" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "设计系统" })).toHaveAttribute(
      "href",
      "/zh/design-system",
    );
    expect(screen.getByText("组件")).toBeVisible();
    expect(screen.getByText("标签按钮")).toBeVisible();
  });
});

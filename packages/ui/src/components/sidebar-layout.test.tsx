import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SidebarLayout } from "./sidebar-layout.tsx";

describe("SidebarLayout structure", () => {
  it("renders the sidebar slot and the content", () => {
    render(<SidebarLayout sidebar={<span>Rail</span>}>Body</SidebarLayout>);
    expect(screen.getByText("Rail")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("SidebarLayout content landmark", () => {
  it("wraps the content in a <main> landmark by default", () => {
    render(<SidebarLayout sidebar={<span>Rail</span>}>Body</SidebarLayout>);
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toContainElement(screen.getByText("Body"));
  });

  it("renders a plain <div> region when as='div'", () => {
    render(
      <SidebarLayout as="div" sidebar={<span>Rail</span>}>
        Body
      </SidebarLayout>,
    );
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("SidebarLayout tuning props", () => {
  it("threads the rail width into the grid track and the sticky offset onto the rail", () => {
    const { container } = render(
      <SidebarLayout
        sidebar={<span>Rail</span>}
        sidebarInlineSize="240px"
        stickyInsetBlockStart="80px"
      >
        Body
      </SidebarLayout>,
    );
    // The rail width feeds the responsive grid track on the root element.
    expect(container.firstElementChild?.getAttribute("style")).toContain(
      "240px",
    );
    // The sticky offset is applied to the rail element itself.
    const rail = screen.getByText("Rail").parentElement;
    expect(rail?.getAttribute("style")).toContain("80px");
  });

  it("caps the content column when contentMaxInlineSize is passed", () => {
    render(
      <SidebarLayout sidebar={<span>Rail</span>} contentMaxInlineSize="480px">
        Body
      </SidebarLayout>,
    );
    expect(screen.getByText("Body").getAttribute("style")).toContain("480px");
  });
});

import { describe, expect, it } from "vitest";
import { render } from "#src/test-utils.tsx";
import { Identifier } from "./identifier.tsx";

/** The rendered name with each `<wbr>` shown as `|`, so seams are readable. */
function seams(name: string) {
  const { container } = render(<Identifier>{name}</Identifier>);
  const rendered = container.firstElementChild;
  if (rendered === null) throw new Error("Identifier rendered nothing");
  return rendered.innerHTML.replaceAll("<wbr>", "|");
}

describe("Identifier", () => {
  it("keeps a group prefix with its dot and breaks after it", () => {
    expect(seams("color.accent")).toBe("color.|accent");
  });

  it("breaks before each camelCase hump", () => {
    expect(seams("color.surfaceAccentSubtle")).toBe(
      "color.|surface|Accent|Subtle",
    );
  });

  it("keeps a step suffix attached to the word it indexes", () => {
    expect(seams("font.weight_1")).toBe("font.|weight_1");
    expect(seams("border.radius_round")).toBe("border.|radius_round");
    expect(seams("space._00")).toBe("space.|_00");
  });

  it("leaves a name with no seams whole", () => {
    expect(seams("aria-labelledby")).toBe("aria-labelledby");
  });

  it("breaks a bare component name at its humps only", () => {
    expect(seams("GlobeHemisphereWest")).toBe("Globe|Hemisphere|West");
  });

  it("does not break inside a digit run", () => {
    expect(seams("a11y.focusRingInset")).toBe("a11y.|focus|Ring|Inset");
  });

  it("adds no characters to the readable or copyable name", () => {
    const name = "color.bgInteractiveSelected";
    const { container } = render(<Identifier>{name}</Identifier>);

    expect(container.textContent).toBe(name);
  });
});

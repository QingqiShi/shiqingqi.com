import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar.tsx";

describe("Avatar naming", () => {
  it("announces as a single image named by the person", () => {
    render(<Avatar name="Qingqi Shi" />);

    expect(screen.getByRole("img", { name: "Qingqi Shi" })).toBeInTheDocument();
  });

  it("derives a monogram from the first and last words", () => {
    render(<Avatar name="Ada Byron Lovelace" />);

    expect(screen.getByRole("img")).toHaveTextContent("AL");
  });

  it("takes one character from a single-word name", () => {
    render(<Avatar name="石头" />);

    expect(screen.getByRole("img")).toHaveTextContent("石");
  });
});

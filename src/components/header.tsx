import * as stylex from "@stylexjs/stylex";
import { LayoutProps } from "../types";
import { Button } from "./button";
import { ThemeSwitch } from "./theme-switch";

export function Header({ params }: Omit<LayoutProps, "children">) {
  return (
    <div>
      <nav>
        <p>Offline notice</p>
        <Button>locale selector</Button>
        <ThemeSwitch />
      </nav>
    </div>
  );
}

const styles = stylex.create({});

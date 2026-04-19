import "react";

declare module "react" {
  interface CSSProperties {
    [cssVar: `--${string}`]: string | number | undefined;
  }
}

declare module "virtual:tinker-config" {
  import type { TinkerConfig } from "@tuja/component-tinker";

  const config: TinkerConfig;
  export default config;
}

declare module "virtual:tinker-catalogue" {
  import type { Catalogue } from "@tuja/component-tinker";

  const catalogue: Catalogue;
  export default catalogue;
}

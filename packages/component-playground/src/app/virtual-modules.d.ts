declare module "virtual:playground-config" {
  import type { PlaygroundConfig } from "@tuja/component-playground";

  const config: PlaygroundConfig;
  export default config;
}

declare module "virtual:playground-catalogue" {
  import type { Catalogue } from "@tuja/component-playground";

  const catalogue: Catalogue;
  export default catalogue;
}

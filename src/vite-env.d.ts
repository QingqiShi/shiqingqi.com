/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.glsl' {
  const src: string;
  export default src;
}

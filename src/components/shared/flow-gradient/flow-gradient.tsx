import * as fs from "node:fs/promises";
import * as path from "node:path";
import { FlowGradientClient } from "./flow-gradient-client";

export async function FlowGradient() {
  const [fragShader, vertShader] = await Promise.all(
    process.env.NODE_ENV === "production"
      ? [
          fetch(
            "https://0tius9gdxi32io0t.public.blob.vercel-storage.com/shaders/fs.glsl"
          ).then((result) => result.text()),
          fetch(
            "https://0tius9gdxi32io0t.public.blob.vercel-storage.com/shaders/vs.glsl"
          ).then((result) => result.text()),
        ]
      : [
          fs.readFile(
            path.resolve(
              process.cwd(),
              "./src/components/shared/flow-gradient/shaders/fs.glsl"
            ),
            "utf-8"
          ),
          fs.readFile(
            path.resolve(
              process.cwd(),
              "./src/components/shared/flow-gradient/shaders/vs.glsl"
            ),
            "utf-8"
          ),
        ]
  );
  return <FlowGradientClient fs={fragShader} vs={vertShader} />;
}

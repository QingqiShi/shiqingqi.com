import { promises as fs } from "fs";
import { FlowGradientClient } from "./flow-gradient-client";

export async function FlowGradient() {
  const [fragShader, vertShader] = await Promise.all([
    fs.readFile(
      process.cwd() + "/src/server-components/flow-gradient/shaders/fs.glsl",
      "utf-8"
    ),
    fs.readFile(
      process.cwd() + "/src/server-components/flow-gradient/shaders/vs.glsl",
      "utf-8"
    ),
  ]);
  return <FlowGradientClient fs={fragShader} vs={vertShader} />;
}

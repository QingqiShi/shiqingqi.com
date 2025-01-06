import { FlowGradientClient } from "./flow-gradient-client";

export async function FlowGradient() {
  const [fragShader, vertShader] = await Promise.all([
    fetch(
      "https://0tius9gdxi32io0t.public.blob.vercel-storage.com/shaders/fs.glsl"
    ).then((result) => result.text()),
    fetch(
      "https://0tius9gdxi32io0t.public.blob.vercel-storage.com/shaders/vs.glsl"
    ).then((result) => result.text()),
  ]);
  return <FlowGradientClient fs={fragShader} vs={vertShader} />;
}

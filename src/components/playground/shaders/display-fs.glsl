#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;

out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = texture(u_texture, uv).rgb;

  // Reinhard tone mapping
  col = col / (col + 1.0f);

  // Gamma correction
  col = pow(col, vec3(0.4545f));

  outColor = vec4(col, 1.0f);
}

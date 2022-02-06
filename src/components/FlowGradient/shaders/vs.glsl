#version 300 es

in vec2 a_position;

uniform vec2 u_resolution;
uniform float u_dpi;
uniform float u_time;
uniform vec3 u_colorTop;
uniform vec3 u_colorBottom;
uniform vec3 u_colorAltTop;
uniform vec3 u_colorAltBottom;
uniform vec3 u_colorBackground;

out vec4 v_color;

#include utils/snoise;
#include utils/clip;

void main() {
  vec2 clipSpace = a_position / u_resolution * 2.0 - 1.0;

  // wave amplitude
  float amplitudeClipSpace = 0.7;

  // Noises
  float noiseSize = (1.0 - amplitudeClipSpace) * 0.007;
  float noiseMain = snoise(vec3(a_position.x / u_dpi * noiseSize - u_time * 0.00005, a_position.y / u_dpi * noiseSize + u_time * 0.00007, u_time * 0.00007));
  float noiseAlt = pow(snoise(vec3(a_position.x / u_dpi * noiseSize - u_time * 0.00005, a_position.y / u_dpi * noiseSize + u_time * 0.00005, u_time * 0.0001)) * 0.5 + 0.5, 2.0);

  // Calculate wave offset
  vec2 offset = vec2(0.0, amplitudeClipSpace * noiseMain);
  if(clipSpace.y > 1.0 - amplitudeClipSpace) {
    float distToEdge = 1.0 - clipSpace.y;
    float factor = distToEdge / amplitudeClipSpace;
    offset.y = offset.y * factor;
  }
  if(clipSpace.y < -0.9) {
    float distToEdge = clipSpace.y + 1.0;
    float factor = distToEdge / 0.1;
    offset.y = offset.y * factor;
  }

  vec2 afterFx = clipSpace - offset;

  float posFactor = a_position.y / u_resolution.y;
  vec3 colorMain = u_colorTop + (u_colorBottom - u_colorTop) * posFactor;
  vec3 colorAlt = u_colorAltTop + (u_colorAltBottom - u_colorAltTop) * posFactor;
  vec3 color = colorMain + (colorAlt * noiseAlt);

  float factor = posFactor * 1.1111;
  v_color = vec4(color * clip(1.0 - factor) + u_colorBackground * clip(factor), 1.0);

  gl_Position = vec4(afterFx * vec2(1.0, -1.0), 0, 1);
}

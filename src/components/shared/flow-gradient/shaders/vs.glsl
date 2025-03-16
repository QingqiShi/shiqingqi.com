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
uniform vec2 u_mouse;
uniform float u_rippleStrength;
uniform float u_ripplePhase;

out vec4 v_color;

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0f / 289.0f)) * 289.0f;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0f / 289.0f)) * 289.0f;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0f) + 10.0f) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159f - 0.85373472095314f * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0f / 6.0f, 1.0f / 3.0f);
  const vec4 D = vec4(0.0f, 0.5f, 1.0f, 2.0f);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0f - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0f, i1.z, i2.z, 1.0f)) + i.y + vec4(0.0f, i1.y, i2.y, 1.0f)) + i.x + vec4(0.0f, i1.x, i2.x, 1.0f));

  float n_ = 0.142857142857f;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0f * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0f * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0f - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0f + 1.0f;
  vec4 s1 = floor(b1) * 2.0f + 1.0f;
  vec4 sh = -step(h, vec4(0.0f));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.5f - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0f);
  m = m * m;
  return 105.0f * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float clip(float x) {
  return clamp(x, 0.0f, 1.0f);
}

void main() {
  vec2 clipSpace = a_position / u_resolution * 2.0f - 1.0f;

  float amplitudeClipSpace = 0.7f;

  float noiseSize = (1.0f - amplitudeClipSpace) * 0.007f;
  float noiseMain = snoise(vec3(a_position.x / u_dpi * noiseSize - u_time * 0.00005f, a_position.y / u_dpi * noiseSize + u_time * 0.00007f, u_time * 0.00007f));
  float noiseAlt = pow(snoise(vec3(a_position.x / u_dpi * noiseSize - u_time * 0.00005f, a_position.y / u_dpi * noiseSize + u_time * 0.00005f, u_time * 0.0001f)) * 0.5f + 0.5f, 2.0f);

  // Calculate mouse distance in pixel space and convert to clip space
  float rippleRadius = 200.0f;
  float mouseDistance = length(abs((a_position - u_mouse) / u_dpi));
  float ripple = mouseDistance > rippleRadius ? 0.0f : (1.0f - mouseDistance / rippleRadius) * sin(mouseDistance / rippleRadius * 10.0f - u_ripplePhase) * u_rippleStrength * 0.1f;

  vec2 offset = vec2(0.0f, amplitudeClipSpace * noiseMain + (u_mouse.x > 0.0f && u_mouse.y > 0.0f ? ripple : 0.0f));

  // Edge checks to taper the noise offset near the screen's top and bottom edges
  if(clipSpace.y > 1.0f - amplitudeClipSpace) {
    float distToEdge = 1.0f - clipSpace.y;
    float factor = distToEdge / amplitudeClipSpace;
    offset.y *= factor;
  }
  if(clipSpace.y < -0.9f) {
    float distToEdge = clipSpace.y + 1.0f;
    float factor = distToEdge / 0.1f;
    offset.y *= factor;
  }

  vec2 afterFx = clipSpace - offset;

  float posFactor = a_position.y / u_resolution.y;
  vec3 colorMain = u_colorTop + (u_colorBottom - u_colorTop) * posFactor;
  vec3 colorAlt = u_colorAltTop + (u_colorAltBottom - u_colorAltTop) * posFactor;
  vec3 color = colorMain + (colorAlt * noiseAlt);

  float factor = posFactor * 1.1111f;
  v_color = vec4(color * clamp(1.0f - factor, 0.0f, 1.0f) + u_colorBackground * clamp(factor, 0.0f, 1.0f), 1.0f);

  gl_Position = vec4(afterFx * vec2(1.0f, -1.0f), 0, 1);
}
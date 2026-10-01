#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_dark;
uniform int u_debugMode; // 0=normal, 1=heatmap, 2=normals, 3=AO only
uniform int u_enableShadows;
uniform int u_enableAO;
uniform int u_enableFresnel;

out vec4 outColor;

// ---- SDF primitives & operations ----

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0f)) + min(max(q.x, max(q.y, q.z)), 0.0f) - r;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5f + 0.5f * (b - a) / k, 0.0f, 1.0f);
  return mix(b, a, h) - k * h * (1.0f - h);
}

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// ---- Scene ----

float scene(vec3 p) {
  float t = u_time * 0.001f;

  // Central blob
  vec3 p1 = p;
  p1.xz *= rot2(t * 0.3f);
  p1.yz *= rot2(t * 0.2f);
  float d = sdRoundBox(p1, vec3(0.6f, 0.6f, 0.6f), 0.15f);

  // Orbiting spheres
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float angle = t * (0.4f + fi * 0.1f) + fi * 1.2566f; // 2*PI/5
    float r = 1.2f + 0.3f * sin(t * 0.5f + fi);
    vec3 offset = vec3(
      r * cos(angle),
      0.5f * sin(t * 0.6f + fi * 2.0f),
      r * sin(angle)
    );
    float size = 0.25f + 0.1f * sin(t * 0.8f + fi * 1.5f);
    d = smin(d, sdSphere(p - offset, size), 0.6f);
  }

  // Floor plane (subtle)
  float floor = p.y + 1.8f;
  d = smin(d, floor, 0.5f);

  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001f, 0.0f);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0f;
  float sca = 1.0f;
  for (int i = 0; i < 2; i++) {
    float h = 0.05f + 0.2f * float(i);
    float d = scene(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.85f;
  }
  return clamp(1.0f - 3.0f * occ, 0.0f, 1.0f);
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0f;
  float t = mint;
  for (int i = 0; i < 12; i++) {
    float h = scene(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.05f, 0.3f);
    if (h < 0.002f || t > maxt) break;
  }
  return clamp(res, 0.0f, 1.0f);
}

// Returns vec2(distance, iteration count)
vec2 raymarch(vec3 ro, vec3 rd) {
  float t = 0.0f;
  for (int i = 0; i < 48; i++) {
    float d = scene(ro + rd * t);
    if (d < 0.002f) return vec2(t, float(i));
    if (t > 15.0f) break;
    t += d;
  }
  return vec2(-1.0f, 48.0f);
}

// Heatmap: blue (cheap) → green → yellow → red (expensive)
vec3 heatmap(float t) {
  vec3 c;
  t = clamp(t, 0.0f, 1.0f);
  if (t < 0.33f) {
    c = mix(vec3(0.0f, 0.0f, 1.0f), vec3(0.0f, 1.0f, 0.0f), t / 0.33f);
  } else if (t < 0.66f) {
    c = mix(vec3(0.0f, 1.0f, 0.0f), vec3(1.0f, 1.0f, 0.0f), (t - 0.33f) / 0.33f);
  } else {
    c = mix(vec3(1.0f, 1.0f, 0.0f), vec3(1.0f, 0.0f, 0.0f), (t - 0.66f) / 0.34f);
  }
  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5f * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Mouse influence on camera
  vec2 mouse = u_mouse / u_resolution - 0.5f;
  if (u_mouse.x <= 0.0f && u_mouse.y <= 0.0f) {
    mouse = vec2(0.0f);
  }

  // Camera
  float camAngle = mouse.x * 2.0f + u_time * 0.0002f;
  float camHeight = 1.5f + mouse.y * 2.0f;
  vec3 ro = vec3(4.0f * cos(camAngle), camHeight, 4.0f * sin(camAngle));
  vec3 target = vec3(0.0f, -0.2f, 0.0f);
  vec3 fwd = normalize(target - ro);
  vec3 right = normalize(cross(fwd, vec3(0.0f, 1.0f, 0.0f)));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

  // Theme colors
  vec3 bgColor = mix(vec3(0.95f, 0.93f, 0.93f), vec3(0.02f, 0.02f, 0.04f), u_dark);
  vec3 matColor = mix(
    vec3(0.5f, 0.3f, 0.7f),
    vec3(0.4f, 0.2f, 0.8f),
    u_dark
  );
  vec3 accentColor = mix(
    vec3(0.9f, 0.3f, 0.3f),
    vec3(1.0f, 0.3f, 0.5f),
    u_dark
  );

  // Background gradient
  vec3 col = bgColor + uv.y * 0.1f * mix(vec3(0.2f, 0.1f, 0.3f), vec3(0.05f, 0.02f, 0.1f), u_dark);

  vec2 hit = raymarch(ro, rd);
  float t = hit.x;
  float iters = hit.y;

  // Debug: iteration heatmap
  if (u_debugMode == 1) {
    outColor = vec4(heatmap(iters / 48.0f), 1.0f);
    return;
  }

  if (t > 0.0f) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);

    // Debug: normals
    if (u_debugMode == 2) {
      outColor = vec4(n * 0.5f + 0.5f, 1.0f);
      return;
    }

    // Lighting
    vec3 lightDir = normalize(vec3(1.5f, 2.0f, 1.0f));
    float diff = clamp(dot(n, lightDir), 0.0f, 1.0f);
    float ao = u_enableAO == 1 ? calcAO(p, n) : 1.0f;
    float sha = u_enableShadows == 1 ? softShadow(p, lightDir, 0.02f, 5.0f, 16.0f) : 1.0f;

    // Debug: AO only
    if (u_debugMode == 3) {
      outColor = vec4(vec3(ao), 1.0f);
      return;
    }

    // Fresnel
    float fresnel = u_enableFresnel == 1
      ? pow(1.0f - clamp(dot(n, -rd), 0.0f, 1.0f), 3.0f)
      : 0.0f;

    // Color based on position + normal
    float blend = 0.5f + 0.5f * sin(p.y * 2.0f + u_time * 0.001f);
    vec3 surfaceColor = mix(matColor, accentColor, blend);

    // Ambient
    vec3 ambient = mix(vec3(0.15f, 0.12f, 0.18f), vec3(0.05f, 0.03f, 0.08f), u_dark);

    col = surfaceColor * (ambient + diff * sha * vec3(1.0f, 0.95f, 0.9f));
    col += fresnel * mix(vec3(0.3f, 0.2f, 0.5f), vec3(0.2f, 0.1f, 0.4f), u_dark) * ao;
    col *= ao;

    // Fog
    float fog = 1.0f - exp(-0.04f * t * t);
    col = mix(col, bgColor, fog);
  }

  // Tone mapping and gamma
  col = col / (col + 1.0f);
  col = pow(col, vec3(0.4545f));

  outColor = vec4(col, 1.0f);
}

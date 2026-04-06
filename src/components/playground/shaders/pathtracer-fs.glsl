#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_dark;
uniform int u_debugMode;     // 0=normal, 1=noisy(single sample), 2=normals, 3=albedo
uniform int u_enableShadows; // bounced indirect light
uniform int u_enableAO;      // ground plane
uniform int u_enableFresnel;  // metallic materials
uniform sampler2D u_prevFrame;
uniform float u_frameIndex;

out vec4 outColor;

// ---- RNG (PCG) ----

uint rngState;

void rngSeed(uvec2 pixel, uint frame) {
  rngState = pixel.x * 1973u + pixel.y * 9277u + frame * 26699u + 1u;
}

uint pcgHash() {
  rngState = rngState * 747796405u + 2891336453u;
  uint word = ((rngState >> ((rngState >> 28u) + 4u)) ^ rngState) * 277803737u;
  return (word >> 22u) ^ word;
}

float rand() {
  return float(pcgHash()) / 4294967295.0f;
}

vec3 randomOnSphere() {
  float z = 2.0f * rand() - 1.0f;
  float a = 6.283185f * rand();
  float r = sqrt(1.0f - z * z);
  return vec3(r * cos(a), r * sin(a), z);
}

// Cosine-weighted hemisphere sampling
vec3 cosineDir(vec3 n) {
  float r1 = rand();
  float r2 = rand();
  float phi = 6.283185f * r1;
  float cosTheta = sqrt(1.0f - r2);
  float sinTheta = sqrt(r2);

  vec3 a = abs(n.x) > 0.9f ? vec3(0.0f, 1.0f, 0.0f) : vec3(1.0f, 0.0f, 0.0f);
  vec3 u = normalize(cross(a, n));
  vec3 v = cross(n, u);

  return normalize(u * cos(phi) * sinTheta + v * sin(phi) * sinTheta + n * cosTheta);
}

// ---- Ray-primitive intersections ----

struct Hit {
  float t;
  vec3 normal;
  vec3 albedo;
  float metallic;
  vec3 emission;
};

bool hitSphere(vec3 ro, vec3 rd, vec3 center, float radius, float tMin, float tMax, inout float t, inout vec3 n) {
  vec3 oc = ro - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - radius * radius;
  float disc = b * b - c;
  if (disc < 0.0f) return false;

  float sqrtDisc = sqrt(disc);
  float t0 = -b - sqrtDisc;
  if (t0 < tMin || t0 > tMax) {
    t0 = -b + sqrtDisc;
    if (t0 < tMin || t0 > tMax) return false;
  }

  t = t0;
  n = normalize(ro + rd * t - center);
  return true;
}

// ---- Scene ----

bool traceScene(vec3 ro, vec3 rd, inout Hit hit) {
  bool didHit = false;
  float closest = 1e20f;
  float t;
  vec3 n;

  // Ground plane
  if (u_enableAO == 1 && abs(rd.y) > 0.0001f) {
    float tPlane = -ro.y / rd.y;
    if (tPlane > 0.001f && tPlane < closest) {
      closest = tPlane;
      hit.t = tPlane;
      hit.normal = vec3(0.0f, 1.0f, 0.0f);
      vec3 p = ro + rd * tPlane;
      float check = mod(floor(p.x) + floor(p.z), 2.0f);
      hit.albedo = mix(vec3(0.4f), vec3(0.8f), check);
      hit.metallic = 0.0f;
      hit.emission = vec3(0.0f);
      didHit = true;
    }
  }

  // Central sphere — diffuse, theme-colored
  if (hitSphere(ro, rd, vec3(0.0f, 1.0f, 0.0f), 1.0f, 0.001f, closest, t, n)) {
    closest = t;
    hit.t = t;
    hit.normal = n;
    hit.albedo = mix(vec3(0.5f, 0.3f, 0.7f), vec3(0.4f, 0.2f, 0.8f), u_dark);
    hit.metallic = 0.0f;
    hit.emission = vec3(0.0f);
    didHit = true;
  }

  // Gold metallic sphere
  if (hitSphere(ro, rd, vec3(-2.2f, 0.7f, 1.2f), 0.7f, 0.001f, closest, t, n)) {
    closest = t;
    hit.t = t;
    hit.normal = n;
    hit.albedo = vec3(0.9f, 0.7f, 0.3f);
    hit.metallic = u_enableFresnel == 1 ? 1.0f : 0.0f;
    hit.emission = vec3(0.0f);
    didHit = true;
  }

  // Blue diffuse sphere
  if (hitSphere(ro, rd, vec3(2.0f, 0.5f, 0.8f), 0.5f, 0.001f, closest, t, n)) {
    closest = t;
    hit.t = t;
    hit.normal = n;
    hit.albedo = vec3(0.2f, 0.4f, 0.9f);
    hit.metallic = 0.0f;
    hit.emission = vec3(0.0f);
    didHit = true;
  }

  // Silver metallic sphere
  if (hitSphere(ro, rd, vec3(0.8f, 0.3f, -1.8f), 0.3f, 0.001f, closest, t, n)) {
    closest = t;
    hit.t = t;
    hit.normal = n;
    hit.albedo = vec3(0.9f, 0.9f, 0.95f);
    hit.metallic = u_enableFresnel == 1 ? 1.0f : 0.0f;
    hit.emission = vec3(0.0f);
    didHit = true;
  }

  // Red accent sphere
  if (hitSphere(ro, rd, vec3(-1.0f, 0.4f, -1.0f), 0.4f, 0.001f, closest, t, n)) {
    closest = t;
    hit.t = t;
    hit.normal = n;
    hit.albedo = mix(vec3(0.9f, 0.2f, 0.2f), vec3(1.0f, 0.3f, 0.5f), u_dark);
    hit.metallic = 0.0f;
    hit.emission = vec3(0.0f);
    didHit = true;
  }

  return didHit;
}

// ---- Sky / environment ----

vec3 skyColor(vec3 dir) {
  vec3 sunDir = normalize(vec3(2.0f, 4.0f, 1.5f));
  float sunDot = max(dot(dir, sunDir), 0.0f);

  float t = 0.5f + 0.5f * dir.y;
  vec3 sky = mix(vec3(0.7f, 0.75f, 0.9f), vec3(0.3f, 0.5f, 1.0f), t);

  sky += pow(sunDot, 512.0f) * 20.0f; // sun disk
  sky += pow(sunDot, 8.0f) * 0.5f;    // glow

  return sky;
}

// ---- Path tracing ----

vec3 pathTrace(vec3 ro, vec3 rd) {
  vec3 throughput = vec3(1.0f);
  vec3 color = vec3(0.0f);
  int maxBounces = u_enableShadows == 1 ? 5 : 1;

  for (int i = 0; i < 8; i++) {
    if (i >= maxBounces) break;

    Hit hit;
    if (!traceScene(ro, rd, hit)) {
      color += throughput * skyColor(rd);
      break;
    }

    color += throughput * hit.emission;

    vec3 p = ro + rd * hit.t;

    if (hit.metallic > 0.5f) {
      vec3 reflected = reflect(rd, hit.normal);
      rd = normalize(reflected + 0.03f * randomOnSphere());
      ro = p + hit.normal * 0.001f;
      throughput *= hit.albedo;
    } else {
      rd = cosineDir(hit.normal);
      ro = p + hit.normal * 0.001f;
      throughput *= hit.albedo;
    }

    // Russian roulette after 2 bounces
    if (i > 1) {
      float survivalProb = max(throughput.x, max(throughput.y, throughput.z));
      if (rand() > survivalProb) break;
      throughput /= survivalProb;
    }
  }

  return color;
}

void main() {
  rngSeed(uvec2(gl_FragCoord.xy), uint(u_frameIndex));

  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Jittered sub-pixel position for anti-aliasing
  vec2 jitter = vec2(rand(), rand()) - 0.5f;
  vec2 pixelPos = (gl_FragCoord.xy + jitter - 0.5f * u_resolution) / min(u_resolution.x, u_resolution.y);

  // Camera — mouse-controlled, no auto-rotation (accumulation needs stable camera)
  vec2 mouse = u_mouse / u_resolution - 0.5f;
  if (u_mouse.x <= 0.0f && u_mouse.y <= 0.0f) {
    mouse = vec2(0.0f);
  }

  float camAngle = mouse.x * 2.0f;
  float camHeight = 2.5f + mouse.y * 2.0f;
  vec3 ro = vec3(6.0f * cos(camAngle), camHeight, 6.0f * sin(camAngle));
  vec3 target = vec3(0.0f, 0.8f, 0.0f);
  vec3 fwd = normalize(target - ro);
  vec3 right = normalize(cross(fwd, vec3(0.0f, 1.0f, 0.0f)));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd + pixelPos.x * right + pixelPos.y * up);

  // Debug: normals
  if (u_debugMode == 2) {
    Hit hit;
    if (traceScene(ro, rd, hit)) {
      outColor = vec4(hit.normal * 0.5f + 0.5f, 1.0f);
    } else {
      outColor = vec4(0.0f);
    }
    return;
  }

  // Debug: albedo
  if (u_debugMode == 3) {
    Hit hit;
    if (traceScene(ro, rd, hit)) {
      outColor = vec4(hit.albedo, 1.0f);
    } else {
      outColor = vec4(skyColor(rd), 1.0f);
    }
    return;
  }

  vec3 sampleColor = pathTrace(ro, rd);
  sampleColor = min(sampleColor, vec3(10.0f)); // clamp fireflies

  // Debug: raw single noisy sample
  if (u_debugMode == 1) {
    vec3 col = sampleColor / (sampleColor + 1.0f);
    outColor = vec4(pow(col, vec3(0.4545f)), 1.0f);
    return;
  }

  // Accumulate with previous frame in linear HDR space
  vec3 prev = texture(u_prevFrame, uv).rgb;
  float weight = 1.0f / (u_frameIndex + 1.0f);
  vec3 accumulated = mix(prev, sampleColor, weight);

  outColor = vec4(accumulated, 1.0f);
}

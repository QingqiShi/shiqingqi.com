#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_resolution;
uniform vec3 u_camPos;
uniform vec3 u_camFwd;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform vec3 u_prevCamPos;
uniform vec3 u_prevCamFwd;
uniform vec3 u_prevCamRight;
uniform vec3 u_prevCamUp;
uniform int u_hasPrevFrame;
uniform float u_stableFrames;
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

// ---- Procedural noise (deterministic, used for concrete texturing) ----

float hash21(vec2 p) {
  p = fract(p * vec2(234.34f, 435.345f));
  p += dot(p, p + 34.23f);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0f - 2.0f * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0f, 0.0f));
  float c = hash21(i + vec2(0.0f, 1.0f));
  float d = hash21(i + vec2(1.0f, 1.0f));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0f;
  float amp = 0.5f;
  for (int i = 0; i < 5; i++) {
    v += amp * valueNoise(p);
    p *= 2.0f;
    amp *= 0.5f;
  }
  return v;
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

  // Concrete floor
  if (u_enableAO == 1 && abs(rd.y) > 0.0001f) {
    float tPlane = -ro.y / rd.y;
    if (tPlane > 0.001f && tPlane < closest) {
      closest = tPlane;
      hit.t = tPlane;
      vec3 p = ro + rd * tPlane;
      vec2 q = p.xz;

      // Height field — drives both large-scale tonal variation and a
      // micro-relief normal so the surface catches light irregularly.
      float eps = 0.04f;
      float h = fbm(q * 0.8f);
      float hx = fbm((q + vec2(eps, 0.0f)) * 0.8f);
      float hz = fbm((q + vec2(0.0f, eps)) * 0.8f);
      float bumpScale = 0.25f;
      hit.normal = normalize(vec3(
        (h - hx) / eps * bumpScale,
        1.0f,
        (h - hz) / eps * bumpScale
      ));

      // Albedo — warm neutral grey with layered noise and sparse aggregate.
      float medium = valueNoise(q * 4.0f);
      float specks = valueNoise(q * 45.0f);
      vec3 baseColor = vec3(0.54f, 0.52f, 0.5f);
      baseColor *= 0.72f + h * 0.56f;       // large weathering patches
      baseColor *= 0.9f + medium * 0.2f;    // mid-scale grain
      float dark = smoothstep(0.78f, 0.84f, specks);
      baseColor = mix(baseColor, vec3(0.18f, 0.17f, 0.15f), dark * 0.55f);
      float bright = smoothstep(0.94f, 0.97f, specks);
      baseColor = mix(baseColor, vec3(0.85f, 0.83f, 0.8f), bright * 0.65f);

      hit.albedo = baseColor;
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

vec3 pathTrace(vec3 ro, vec3 rd, out float firstHitT) {
  vec3 throughput = vec3(1.0f);
  vec3 color = vec3(0.0f);
  int maxBounces = u_enableShadows == 1 ? 5 : 1;
  firstHitT = -1.0f;

  for (int i = 0; i < 8; i++) {
    if (i >= maxBounces) break;

    Hit hit;
    if (!traceScene(ro, rd, hit)) {
      color += throughput * skyColor(rd);
      break;
    }

    if (i == 0) firstHitT = hit.t;

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

  float minDim = min(u_resolution.x, u_resolution.y);

  // Jittered sub-pixel position for anti-aliasing
  vec2 jitter = vec2(rand(), rand()) - 0.5f;
  vec2 pixelPos = (gl_FragCoord.xy + jitter - 0.5f * u_resolution) / minDim;

  vec3 ro = u_camPos;
  vec3 rd = normalize(u_camFwd + pixelPos.x * u_camRight + pixelPos.y * u_camUp);

  // Debug: normals
  if (u_debugMode == 2) {
    Hit hit;
    if (traceScene(ro, rd, hit)) {
      outColor = vec4(hit.normal * 0.5f + 0.5f, hit.t);
    } else {
      outColor = vec4(0.0f, 0.0f, 0.0f, -1.0f);
    }
    return;
  }

  // Debug: albedo
  if (u_debugMode == 3) {
    Hit hit;
    if (traceScene(ro, rd, hit)) {
      outColor = vec4(hit.albedo, hit.t);
    } else {
      outColor = vec4(skyColor(rd), -1.0f);
    }
    return;
  }

  float firstHitT;
  vec3 sampleColor = pathTrace(ro, rd, firstHitT);
  sampleColor = min(sampleColor, vec3(10.0f)); // clamp fireflies

  // Debug: raw single noisy sample
  if (u_debugMode == 1) {
    vec3 col = sampleColor / (sampleColor + 1.0f);
    outColor = vec4(pow(col, vec3(0.4545f)), firstHitT);
    return;
  }

  // --- Temporal accumulation ---
  // Default: no history, use the raw sample.
  vec3 finalColor = sampleColor;

  if (u_hasPrevFrame == 1) {
    // Weight sequence: EMA floor of 1/8 during motion / early rest to keep
    // noise bounded, then 1/(stable+1) arithmetic mean for clean convergence.
    float weight = min(1.0f / (u_stableFrames + 1.0f), 0.125f);

    if (u_stableFrames > 0.5f) {
      // Camera is static — same-pixel accumulation. Reprojection-with-
      // validation would reject silhouette pixels (jitter makes them flip
      // between sphere and ground), leaving edges permanently noisy. When
      // nothing is moving we can trust this pixel's history represents the
      // same sub-pixel neighborhood, and blending the jittered samples in
      // place converges to the correctly anti-aliased color.
      vec3 prevRgb = texture(u_prevFrame, gl_FragCoord.xy / u_resolution).rgb;
      finalColor = mix(prevRgb, sampleColor, weight);
    } else if (firstHitT > 0.0f) {
      // Camera moved — reproject this pixel's world hit through the previous
      // camera and validate via position match to reject disoccluded history.
      vec3 worldHit = ro + rd * firstHitT;
      vec3 delta = worldHit - u_prevCamPos;
      float prevF = dot(delta, u_prevCamFwd);
      if (prevF > 0.001f) {
        vec2 prevPixelPos = vec2(
          dot(delta, u_prevCamRight),
          dot(delta, u_prevCamUp)
        ) / prevF;
        vec2 prevUV = prevPixelPos * (minDim / u_resolution) + 0.5f;

        if (prevUV.x >= 0.0f && prevUV.x <= 1.0f && prevUV.y >= 0.0f && prevUV.y <= 1.0f) {
          vec4 prev = texture(u_prevFrame, prevUV);
          float prevT = prev.a;

          if (prevT > 0.0f) {
            // Reconstruct the world point the previous frame actually shaded
            // at that UV and reject if it's a different surface.
            vec3 prevRd = normalize(u_prevCamFwd
              + prevPixelPos.x * u_prevCamRight
              + prevPixelPos.y * u_prevCamUp);
            vec3 prevWorld = u_prevCamPos + prevRd * prevT;
            float d = length(prevWorld - worldHit);
            float camDist = length(worldHit - u_camPos);
            if (d < 0.05f * camDist) {
              finalColor = mix(prev.rgb, sampleColor, weight);
            }
          }
        }
      }
    }
  }

  // Encode primary hit distance in alpha for next frame's reprojection.
  // -1 means "miss" so downstream frames don't try to reproject from sky.
  outColor = vec4(finalColor, firstHitT > 0.0f ? firstHitT : -1.0f);
}

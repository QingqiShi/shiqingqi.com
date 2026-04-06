#version 300 es

in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0f, 1.0f);
}

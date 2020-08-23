#version 300 es
precision highp float;

#define M_PI 3.141592653589793238462643

in vec3 VPos; // Vertex position

out vec2 vUV;

void main() {
    gl_Position = vec4(VPos, 1.0);
	
	vec2 uv = (VPos.xy + 1.0) * 0.5;
    vUV = vec2(uv.x * 10.0, uv.y * M_PI * 0.5);
}

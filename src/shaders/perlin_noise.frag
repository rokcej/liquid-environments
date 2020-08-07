#version 300 es
precision mediump float;

out vec4 oColor;

uniform vec2 uRes;
uniform float uDT;
uniform float uSeed;

void main() {
	vec2 uv = gl_FragCoord.xy / uRes;

	oColor = vec4(uv, 1.0, 1.0);
}

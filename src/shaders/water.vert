#version 300 es
precision mediump float;

in vec3 VPos; // Vertex position

in vec2 uv;
out vec2 fragUV;

void main() {
	// Projected position
	gl_Position = vec4(VPos, 1.0);

	// Pass uv coordinate to fragment shader
	fragUV = uv;
}

#version 300 es
precision mediump float;

struct Material {
	sampler2D texture0;
    sampler2D texture1;
};

uniform Material material;
uniform vec2 uRes; // Viewport resolution
uniform vec2 uCameraRange; // Camera near & far values

in vec4 vColor;
in float vProjSize;

out vec4 color;

float linearizeDepth(float z_buf) {
	float z_ndc = z_buf * 2.0 - 1.0; 
    return (2.0 * uCameraRange.x * uCameraRange.y) / (uCameraRange.y + uCameraRange.x - z_ndc * (uCameraRange.y - uCameraRange.x));
}

void main() {
	float opacity = 1.0;

	// Depth test
	vec2 uv = gl_FragCoord.xy / uRes;
	float closestDepth = texture(material.texture1, uv).r;
	float currentDepth = gl_FragCoord.z;

	if (closestDepth <= currentDepth)
		discard;

	// Smooth particle transition
	closestDepth = linearizeDepth(closestDepth);
	currentDepth = linearizeDepth(currentDepth);
	float transitionSize = 0.02;
	float depthDiff = clamp(closestDepth - currentDepth, 0.0, 1.0);
	opacity *= smoothstep(0.0, transitionSize, depthDiff);

	// Sprite
	if (vProjSize > 1.0) {
		float radius = length(gl_PointCoord * 2.0 - 1.0);

		float threshold = 0.1;
		if (radius > 1.0)
			discard;
		else if (radius > threshold)
			opacity *= smoothstep(1.0, 0.0, (radius - threshold) / (1.0 - threshold));

		//opacity *= 1.0 - pow(radius, 3.0);
	}
	
	// Color
	color = vColor;
	color.a *= opacity;
}

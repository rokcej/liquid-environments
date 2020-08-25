#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

uniform vec2 uCameraRange; // Camera near & far values
uniform vec3 uCameraPos;
uniform vec3 uCameraDir;

in vec2 fragUV;

in vec3 vFragDir;


out vec4 oColor;

float linearizeDepth(float z_buf) {
	float z_ndc = z_buf * 2.0 - 1.0; 
    return (2.0 * uCameraRange.x * uCameraRange.y) / (uCameraRange.y + uCameraRange.x - z_ndc * (uCameraRange.y - uCameraRange.x));
}

void main() {
	float depthBuffer = texture(material.texture0, fragUV).r;
	float depthLinear = linearizeDepth(depthBuffer);

	vec3 fragDir = normalize(vFragDir);
	float depth = depthLinear / dot(fragDir, uCameraDir);

	float height = fragDir.y * depth + uCameraPos.y;

	oColor = vec4(depth, height, 0.0, 1.0);
}

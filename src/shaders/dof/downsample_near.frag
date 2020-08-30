#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

uniform vec2 uSrcResInv;

in vec2 fragUV;

out vec4 oColor;


uniform float f; // Focal length
uniform float a; // Aperture radius
uniform float v0; // Distance in focus

void main() {
	// Downsample color
	// Use linear filtering to sample 16 pixels with 4 lookups
	vec3 color = 
		texture(material.texture0, fragUV + vec2(-1.0, -1.0) * uSrcResInv).rgb +
		texture(material.texture0, fragUV + vec2(+1.0, -1.0) * uSrcResInv).rgb +
		texture(material.texture0, fragUV + vec2(-1.0, +1.0) * uSrcResInv).rgb +
		texture(material.texture0, fragUV + vec2(+1.0, +1.0) * uSrcResInv).rgb;
	color *= 0.25;

	// Downsample depth
	vec2 uvCol[4];
	uvCol[0] = fragUV + vec2(-1.5, -1.5) * uSrcResInv;
	uvCol[1] = fragUV + vec2(-0.5, -1.5) * uSrcResInv;
	uvCol[2] = fragUV + vec2(+0.5, -1.5) * uSrcResInv;
	uvCol[3] = fragUV + vec2(+1.5, -1.5) * uSrcResInv;
	vec2 uvRowOff = vec2(0.0, uSrcResInv.y);

	// Min approach
	vec4 minDepth = vec4(
		texture(material.texture1, uvCol[0]).r,
		texture(material.texture1, uvCol[1]).r,
		texture(material.texture1, uvCol[2]).r,
		texture(material.texture1, uvCol[3]).r
	);
	for (int i = 1; i < 4; ++i) {
		minDepth = min(minDepth, vec4(
			texture(material.texture1, uvCol[0] + uvRowOff * float(i)).r,
			texture(material.texture1, uvCol[1] + uvRowOff * float(i)).r,
			texture(material.texture1, uvCol[2] + uvRowOff * float(i)).r,
			texture(material.texture1, uvCol[3] + uvRowOff * float(i)).r
		));
	}
	float depth = min(min(minDepth.x, minDepth.y), min(minDepth.z, minDepth.w));
	float noise = texture(material.texture2, fragUV).g;

	// CoC
	float coc = 0.0;
	if (depth < v0)
		coc = a * abs(f / (v0 - f)) * abs(v0 / depth - 1.0);
	coc = min(coc, 1.0);

	oColor = vec4(color, coc);
}

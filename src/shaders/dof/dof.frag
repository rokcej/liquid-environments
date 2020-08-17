#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

uniform vec2 uResInv;

in vec2 fragUV;

out vec4 oColor;


uniform float f; // Focal length
uniform float a; // Aperture radius
uniform float v0; // Distance in focus


vec3 getSmallBlurSample() {
	return (
		texture(material.texture0, fragUV).rgb +
		4.0 * (
			texture(material.texture0, fragUV + vec2(-1.5, -0.5) * uResInv).rgb +
			texture(material.texture0, fragUV + vec2(+0.5, -1.5) * uResInv).rgb +
			texture(material.texture0, fragUV + vec2(+1.5, +0.5) * uResInv).rgb +
			texture(material.texture0, fragUV + vec2(-0.5, +1.5) * uResInv).rgb
		)
	) * 0.058823529411764705882353; // 1.0 / 17.0
}

vec3 interpolateDof(vec3 source, vec3 small, vec3 med, vec3 large, float coc) {
	// Efficiently calculate the cross-blend weights for each sample.
	// Let the unblurred sample to small blur fade happen over distance
	// d0, the small to medium blur over distance d1, and the medium to
	// large blur over distance d2, where d0 + d1 + d2 = 1.

	float t = clamp(coc, 0.0, 1.0);

	float d0 = 0.33, d1 = 0.33, d2 = 0.33;
	vec4 dofLerpScale = vec4(-1.0 / d0, -1.0 / d1, -1.0 / d2, 1.0 / d2);
	vec4 dofLerpBias = vec4(1.0, (1.0 - d2) / d1, 1.0 / d2, (d2 - 1.0) / d2);

	vec4 weights = clamp(t * dofLerpScale + dofLerpBias, 0.0, 1.0);
	weights.yz = min(weights.yz, 1.0 - weights.xy);

	return weights.x * source + weights.y * small + weights.z * med + weights.w * large;
}

void main() {
	vec3 source = texture(material.texture0, fragUV).rgb;
	vec3 small  = getSmallBlurSample();
	vec4 med    = texture(material.texture4, fragUV);
	vec3 large  = texture(material.texture3, fragUV).rgb;

	float depth = texture(material.texture1, fragUV).r;
	
	float noise = texture(material.texture2, fragUV).r * 0.5 + 0.25;
	depth *= noise / (1.0 - noise);

	float cocNear = med.a;
	float cocFar = 0.0;
	if (depth > v0)
		cocFar = a * abs(f / (v0 - f)) * abs(v0 / depth - 1.0);
	float coc = max(cocNear, cocFar);

	vec3 color = interpolateDof(source, small, med.rgb, large, coc);

	oColor = vec4(color, 1.0);
}

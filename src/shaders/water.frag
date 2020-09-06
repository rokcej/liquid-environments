#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

uniform vec3 uLiquidColor;
uniform vec3 uLiquidAtten;
uniform vec2 uFogRange;
uniform vec2 uFogStrength;
uniform float uCameraHeight;
uniform float uNoiseStrength;

in vec2 fragUV;


out vec4 oColor;

vec3 applyFog(vec3 color, float depth, float height, float noise) {
	float y0 = min(uCameraHeight, height);
	float y1 = max(uCameraHeight, height);
	float yMin = uFogRange.x;
	float yMax = uFogRange.y;
	float x0 = uFogStrength.x;
	float x1 = uFogStrength.y;

	float F = 0.0; // Integral sum
	if (y1 - y0 < 0.000001) {
		if (y0 < yMin)
			F = x0;
		else if (y0 > yMax)
			F = x1;
		else
			F = (y0 - yMin) / (yMax - yMin) * (x1 - x0) + x0;
	} else {
		float a, b; // Integration borders
		if (y0 < yMin) {
			a = y0;
			b = min(y1, yMin);
			F += x0 * (b - a);
		}
		if (y0 < yMax && y1 > yMin) {
			a = max(y0, yMin);
			b = min(y1, yMax);
			F += x0 * (b - a) + (x1 - x0) / (yMax - yMin) * (0.5 * (b * b - a * a) - yMin * (b - a));
		}
		if (y1 > yMax) {
			a = max(y0, yMax);
			b = y1;
			F += x1 * (b - a);
		}
		F /= (y1 - y0);
	}
	F *= depth;

	// Beer's law
	float offset = 2.0 * noise * uNoiseStrength + 1.0 - uNoiseStrength; // x / (2 - x) : [0, 2] -> [0, inf]
	vec3 transmittance = exp(-uLiquidAtten * F * offset);
	color *= transmittance;

	// Mix with background color
	color += uLiquidColor * (1.0 - max(max(transmittance.r, transmittance.g), transmittance.b));

	return color;
}

void main() {
	vec3 mainColor = texture(material.texture0, fragUV).rgb;

	vec2 mainDepthDist = texture(material.texture1, fragUV).rg;
	float depth = mainDepthDist.r;
	float height = mainDepthDist.g;
	float noise = texture(material.texture3, fragUV).r;
	mainColor = applyFog(mainColor, depth, height, noise);

	//vec3 particleColor = texture(material.texture2, fragUV).rgb;
	//float particleAlpha = texture(material.texture2, fragUV).a;
	//float particleDepth = texture(material.texture3, fragUV).r;
	//particleColor = applyFog(particleColor, particleDepth, true);

	vec3 lightColor = clamp(texture(material.texture4, fragUV).rgb, 0.0, 1.0);

	//oColor = vec4(mix(mainColor, particleColor, particleAlpha), 1.0);
	//oColor = vec4(mainColor + particleColor, 1.0);
	
	oColor = vec4(mainColor + lightColor, 1.0);
	//oColor = vec4(particleColor, 1.0);

	// // Gamma correction
	// float gamma = 2.2;
	// oColor = vec4(pow(oColor.rgb, vec3(1.0 / gamma)), oColor.a);
}

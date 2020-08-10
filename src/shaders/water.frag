#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

uniform vec2 uRes; // Viewport resolution
uniform vec2 uCameraRange; // Camera near & far values

uniform vec3 uLiquidColor;
uniform vec3 uLiquidAtten;

in vec2 fragUV;

out vec4 oColor;


float linearizeDepth(float z_buf) {
	float z_ndc = z_buf * 2.0 - 1.0; 
    return (2.0 * uCameraRange.x * uCameraRange.y) / (uCameraRange.y + uCameraRange.x - z_ndc * (uCameraRange.y - uCameraRange.x));
}

vec3 applyFog(vec3 colorBuf, float depthBuf, float noise) {
	float depth = linearizeDepth(depthBuf);

	depth += (noise * 2.0 - 1.0) * 10.0;
	if (depth < 0.0)
	 	depth = 0.0;
	
	vec3 atten = uLiquidAtten; // * (1.0 + (noise * 2.0 - 1.0) * 3.0);

	// Beer's law
	vec3 transmittance = exp(-atten * depth);
	vec3 color = colorBuf * transmittance;

	// Mix with background color
	color += uLiquidColor * (1.0 - transmittance.b);

	return color;
}

void main() {
	vec3 mainColor = texture(material.texture0, fragUV).rgb;
	float mainDepth = texture(material.texture1, fragUV).r;
	float noise = texture(material.texture3, fragUV).r;
	mainColor = applyFog(mainColor, mainDepth, noise);

	vec3 particleColor = texture(material.texture2, fragUV).rgb;
	//float particleAlpha = texture(material.texture2, fragUV).a;
	//float particleDepth = texture(material.texture3, fragUV).r;
	//particleColor = applyFog(particleColor, particleDepth, true);

	//oColor = vec4(mix(mainColor, particleColor, particleAlpha), 1.0);
	oColor = vec4(mainColor + particleColor, 1.0);
	
	//oColor = vec4(mainColor, 1.0);
	//oColor = vec4(particleColor, 1.0);
	//oColor = texture(material.texture3, fragUV);

	// // Gamma correction
	// float gamma = 2.2;
	// oColor = vec4(pow(oColor.rgb, vec3(1.0 / gamma)), oColor.a);
}

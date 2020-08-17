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

in vec2 fragUV;


out vec4 oColor;

vec3 applyFog(vec3 color, float depth, float noise) {
	/*vec3 fragPos = depth * fragDir + uCameraPos;
	float y0 = max(min(uCameraPos.y, 6.0), -4.0);
	float y1 = max(min(fragPos.y, 6.0), -4.0);
	float integral = 6.0 * y1 - y1 * y1 * 0.5 - 6.0 * y0 + y0 * y0 * 0.5;
	float F = depth / (fragPos.y - uCameraPos.y) * 0.02 * integral;
	float fog = exp(-F);
	return colorBuf * fog + vec3(1.0) * (1.0 - fog);*/

	// Beer's law
	vec3 transmittance = exp(-uLiquidAtten * depth * noise);
	color *= transmittance;

	// Mix with background color
	color += uLiquidColor * (1.0 - transmittance.b);

	return color;
}

void main() {
	vec3 mainColor = texture(material.texture0, fragUV).rgb;
	float mainDepth = texture(material.texture1, fragUV).r;
	float noise = texture(material.texture3, fragUV).r;
	//mainColor = applyFog(mainColor, mainDepth, noise);

	vec3 particleColor = texture(material.texture2, fragUV).rgb;
	//float particleAlpha = texture(material.texture2, fragUV).a;
	//float particleDepth = texture(material.texture3, fragUV).r;
	//particleColor = applyFog(particleColor, particleDepth, true);

	//oColor = vec4(mix(mainColor, particleColor, particleAlpha), 1.0);
	//oColor = vec4(mainColor + particleColor, 1.0);
	
	//oColor = vec4(mainColor, 1.0);
	//oColor = vec4(particleColor, 1.0);
	oColor = texture(material.texture4, fragUV);

	// // Gamma correction
	// float gamma = 2.2;
	// oColor = vec4(pow(oColor.rgb, vec3(1.0 / gamma)), oColor.a);
}

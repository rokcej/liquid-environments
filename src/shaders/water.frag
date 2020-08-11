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

uniform vec3 uCameraPos;
uniform vec3 uCameraDir;

in vec2 fragUV;

in vec3 vFragDir;


out vec4 oColor;

float linearizeDepth(float z_buf) {
	float z_ndc = z_buf * 2.0 - 1.0; 
    return (2.0 * uCameraRange.x * uCameraRange.y) / (uCameraRange.y + uCameraRange.x - z_ndc * (uCameraRange.y - uCameraRange.x));
}

vec3 applyFog(vec3 colorBuf, float depthBuf, float noise) {
	// Linearize depth buffer value
	float depth = linearizeDepth(depthBuf);
	// Get actual distance from camera
	vec3 fragDir = normalize(vFragDir);
	depth /= dot(fragDir, uCameraDir);

	/*vec3 fragPos = depth * fragDir + uCameraPos;
	float y0 = max(min(uCameraPos.y, 6.0), -4.0);
	float y1 = max(min(fragPos.y, 6.0), -4.0);
	float integral = 6.0 * y1 - y1 * y1 * 0.5 - 6.0 * y0 + y0 * y0 * 0.5;
	float F = depth / (fragPos.y - uCameraPos.y) * 0.02 * integral;
	float fog = exp(-F);
	return colorBuf * fog + vec3(1.0) * (1.0 - fog);*/

	// Beer's law
	vec3 transmittance = exp(-uLiquidAtten * depth * noise);
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

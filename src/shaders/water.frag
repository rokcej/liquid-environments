#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

in vec2 fragUV;

out vec4 color;

float depth2dist(float depth) {
	float near = 0.1, far = 1000.0;

	float ndc = depth * 2.0 - 1.0;
	return (2.0 * near * far) / (far + near - ndc * (far - near));
}

void main() {
	vec4 mainColor = texture(material.texture0, fragUV);
	vec4 particleColor = texture(material.texture2, fragUV);
	//color = vec4(particleColor.rgb * particleColor.a + mainColor.rgb * (1.0 - particleColor.a), 1.0);
	color = mainColor + particleColor;

	float maxDist = 30.0;
	float minAtten = 0.1;
	vec4 waterColor = vec4(0.0, 0.3, 0.7, 1.0);

	float depth = texture(material.texture1, fragUV).r;
	float dist = depth2dist(depth);

	// Beer's law
	float transmittance = exp(-0.1 * dist);
	//color = mix(waterColor, color, transmittance);
}

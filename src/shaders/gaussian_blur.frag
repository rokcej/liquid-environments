#version 300 es
precision mediump float;

#define NUM_WEIGHTS 5
// http://dev.theomader.com/gaussian-kernel-calculator/
const float weights[NUM_WEIGHTS] =
	float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216); // Sigma = ~1.75, Kernel size = 11
	//float[] (0.197448, 0.174697, 0.120999, 0.065602, 0.02784, 0.009246, 0.002403, 0.000489); // Sigma = 2.0, Kernel size = 17

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

in vec2 fragUV;
in vec3 vFragDir;

out vec4 oColor;
  
uniform bool horizontal;

void main() {
	vec2 texOffset = 1.0 / vec2(textureSize(material.texture0, 0)); // Gets size of single texel
	vec4 color = texture(material.texture0, fragUV) * weights[0]; // Current fragment's contribution
	if (horizontal) {
		for (int i = 1; i < NUM_WEIGHTS; ++i) {
			color += texture(material.texture0, fragUV + vec2(texOffset.x * float(i), 0.0)) * weights[i];
			color += texture(material.texture0, fragUV - vec2(texOffset.x * float(i), 0.0)) * weights[i];
		}
	} else {
		for (int i = 1; i < NUM_WEIGHTS; ++i) {
			color += texture(material.texture0, fragUV + vec2(0.0, texOffset.y * float(i))) * weights[i];
			color += texture(material.texture0, fragUV - vec2(0.0, texOffset.y * float(i))) * weights[i];
		}
	}
	oColor = color;
}

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

void main() {
	vec4 color = 
		texture(material.texture0, fragUV + vec2(-0.5, -0.5) * uResInv) +
		texture(material.texture0, fragUV + vec2(+0.5, -0.5) * uResInv) +
		texture(material.texture0, fragUV + vec2(-0.5, +0.5) * uResInv) +
		texture(material.texture0, fragUV + vec2(+0.5, +0.5) * uResInv);
	color *= 0.25;

	oColor = color;
}

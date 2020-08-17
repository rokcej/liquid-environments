#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

in vec2 fragUV;

out vec4 oColor;

void main() {
	vec4 downsampled = texture(material.texture0, fragUV);
	vec4 blurred     = texture(material.texture1, fragUV);
	
	vec3 color = downsampled.rgb;
	float coc = 2.0 * max(blurred.a, downsampled.a) - downsampled.a;
	//float coc = max(downsampled.a, 2.0 * blurred.a - downsampled.a);

	oColor = vec4(color, coc);
}

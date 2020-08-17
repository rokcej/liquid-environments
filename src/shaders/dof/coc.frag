#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

in vec2 fragUV;

in vec3 vFragDir;

out vec4 oColor;

float f = 16.0; // Focal length
float a = 1.0; // Aperture radius
float v0 = 4.0; // Distance in focus

void main() {
	vec4 color = texture(material.texture0, fragUV);
	float depth = texture(material.texture1, fragUV).r;
	
	float coc = a * abs(f / (v0 - f)) * abs(v0 / depth - 1.0);

	oColor = vec4(vec3(coc), 1.0);
}

#version 300 es
precision mediump float;

struct Material {
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

uniform Material material;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 oColor;


void main() {
	vec3 tex0 = texture(material.texture0, fragUV).rgb;
	float coc = texture(material.texture0, fragUV).a;
	vec3 tex1 = texture(material.texture1, fragUV).rgb;


	vec3 off = vec3(0.006, 0.0, -0.006) * coc;
	float r = texture(material.texture0, (fragUV - 0.5) * (1.0 + off.r) + 0.5).r;
	float g = texture(material.texture0, (fragUV - 0.5) * (1.0 + off.g) + 0.5).g;
	float b = texture(material.texture0, (fragUV - 0.5) * (1.0 + off.b) + 0.5).b;

	oColor = vec4(vec3(r, g, b) + tex1, 1.0);
	//oColor = vec4(tex0, 1.0);
}

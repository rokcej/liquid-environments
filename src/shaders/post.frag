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
	vec4 tex0 = texture(material.texture0, fragUV);
	vec4 tex1 = texture(material.texture1, fragUV);

	vec3 color = tex0.rgb;
	vec3 particles = tex1.rgb;

	#if (RGB_SHIFT)
	float coc = tex0.a;
	vec3 off = vec3(0.004, 0.0, -0.004) * coc;
	color.r = texture(material.texture0, (fragUV - 0.5) * (1.0 + off.r) + 0.5).r;
	color.g = texture(material.texture0, (fragUV - 0.5) * (1.0 + off.g) + 0.5).g;
	color.b = texture(material.texture0, (fragUV - 0.5) * (1.0 + off.b) + 0.5).b;
	#fi

	oColor = vec4(color + particles, 1.0);
	//oColor = vec4(tex0, 1.0);
}

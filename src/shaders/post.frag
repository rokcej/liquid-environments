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
	vec3 tex1 = texture(material.texture1, fragUV).rgb;

	oColor = vec4(tex0 + tex1, 1.0);
}

#version 300 es
precision mediump float;

struct Material {
	#if (TEXTURE)
		#for I_TEX in 0 to NUM_TEX
			sampler2D texture##I_TEX;
		#end
	#fi
};

uniform Material material;

#if (TEXTURE)
	in vec2 fragUV;
#fi

out vec4 oColor;

void main() {
	vec4 color = vec4(0.0);

	#if (TEXTURE)
		#for I_TEX in 0 to NUM_TEX
			color += texture(material.texture##I_TEX, fragUV).rgba;
		#end
	#fi

	oColor = color;
}

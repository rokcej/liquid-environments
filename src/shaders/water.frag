#version 300 es
precision mediump float;

struct Material {
	vec3 diffuse;
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

out vec4 color;

float depth2dist(float depth) {
	float near = 0.1, far = 1000.0;

	float ndc = depth * 2.0 - 1.0;
	return (2.0 * near * far) / (far + near - ndc * (far - near));
}

void main() {
	//color = vec4(material.diffuse, 1.0);
	color = texture(material.texture0, fragUV);

	float maxDist = 30.0;
	float minAtten = 0.1;
	vec4 waterColor = vec4(0.0, 0.3, 0.7, 1.0);

	float depth = texture(material.texture1, fragUV).r;
	float dist = depth2dist(depth);

	// Attenuation based on distance
	/*float atten = min(dist / maxDist, 1.0);
	atten = pow(atten, 0.8); // Make the falloff less linear
	atten = atten * (1.0 - minAtten) + minAtten; // Add initial attenuation

	//color *= vec4(vec3(atten), 1.0);
	color = mix(color, waterColor, atten);*/

	// Beer's law
	float transmittance = exp(-0.1 * dist);
	color = mix(waterColor, color, transmittance);
}

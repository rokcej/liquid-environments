#version 300 es
precision mediump float;

struct Light {
	bool directional;
	vec3 position;
	vec3 color;
};

struct Material {
    vec3 diffuse;
	
	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

#if (!NO_LIGHTS)
uniform Light lights[##NUM_LIGHTS];
#fi
uniform mat4 MVMat; // Model View Matrix

uniform vec3 ambient;
uniform Material material;

uniform vec2 uResInv;

in vec3 vEyePos;
in float vLightDist;

out vec4 oColor;

void main() {
	vec2 uv = gl_FragCoord.xy * uResInv;

	// Manual depth test
	//float currentDepth = gl_FragCoord.z;
	float currentDepth = length(vEyePos);
	float closestDepth = texture(material.texture1, uv).r;
	// if (closestDepth <= currentDepth)
	// 	discard;
	float depth = min(currentDepth, closestDepth);

	vec3 color = vec3(0.7, 0.84, 1.0);
	float alpha = (1.0 - exp(-0.01 * depth));// * exp(-0.1 * vLightDist);
	//float alpha = exp(-vLightDist / depth);
	//float alpha = depth / 100.0 * exp(-0.1 * vLightDist);

	if (gl_FrontFacing) {
		//color *= -1.0;
		alpha *= -1.0;
	} else {
		//discard;
	}

	// Color
	oColor = vec4(color, alpha);
}

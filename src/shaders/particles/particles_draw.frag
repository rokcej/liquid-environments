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

uniform vec2 uRes; // Viewport resolution
uniform vec2 uCameraRange; // Camera near & far values

uniform vec3 uLiquidColor;
uniform vec3 uLiquidAtten;

in vec4 vColor;
in vec3 vPos;
in float vProjSize;
in float vDepthDist;

out vec4 oColor;

vec3 applyFog(vec3 color, float depth, float noise) {
	// Beer's law
	vec3 transmittance = exp(-uLiquidAtten * depth * noise);

	return color * transmittance; // + uLiquidColor * (1.0 - transmittance.b);
}

vec3 calcLight(Light light) {
	if (!light.directional) { // Point light
		// Attenuation
		float dist = length(light.position - vPos);
		float attenuation = 1.0f / (1.0f + 0.01f * dist + 0.0001f * (dist * dist));

		// Transmittance
		vec3 transmittance = exp(-uLiquidAtten * dist);

		return light.color * transmittance * attenuation;
	} else { // Directional light
		vec3 lightDir = normalize(light.position);
		return light.color;
	}
}

void main() {
	float opacity = 1.0;

	// Depth test
	vec2 uv = gl_FragCoord.xy / uRes;
	float currentDepth = vDepthDist;
	float closestDepth = texture(material.texture1, uv).r;

	// Manual depth test
	if (closestDepth <= currentDepth)
		discard;

	// Smooth particle transition
	float transitionSize = 0.02;
	float depthDiff = clamp(closestDepth - currentDepth, 0.0, 1.0);
	opacity *= smoothstep(0.0, transitionSize, depthDiff);

	// Sprite
	if (vProjSize > 1.0) {
		float radius = length(gl_PointCoord * 2.0 - 1.0);

		float threshold = 0.1;
		if (radius > 1.0)
			discard;
		else if (radius > threshold)
			opacity *= smoothstep(1.0, 0.0, (radius - threshold) / (1.0 - threshold));
	}

	// Light
	vec3 illum = ambient;
	#if (!NO_LIGHTS)
		#for lightIdx in 0 to NUM_LIGHTS
			illum += calcLight(lights[##lightIdx]);
		#end
	#fi

	// Perlin noise
	float noise = texture(material.texture2, uv).r;
	
	// Color
	oColor = vec4(applyFog(vColor.rgb * illum, currentDepth, noise), vColor.a * opacity);
}

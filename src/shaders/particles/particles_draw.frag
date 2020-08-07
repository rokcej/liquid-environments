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

uniform vec3 ambient;
uniform Material material;

uniform vec3 cameraPosition;
uniform vec2 uRes; // Viewport resolution
uniform vec2 uCameraRange; // Camera near & far values

uniform float uLiquidAtten;

in vec4 vColor;
in vec3 vPos;
in float vProjSize;

out vec4 oColor[2];

float linearizeDepth(float z_buf) {
	float z_ndc = z_buf * 2.0 - 1.0; 
    return (2.0 * uCameraRange.x * uCameraRange.y) / (uCameraRange.y + uCameraRange.x - z_ndc * (uCameraRange.y - uCameraRange.x));
}

vec3 applyFog(vec3 color, float depth) {
	vec3 atten = vec3(
		uLiquidAtten + 0.02,
		uLiquidAtten + 0.01,
		uLiquidAtten
	);
	
	// Beer's law
	vec3 transmittance = exp(-atten * depth);
	return color * transmittance;
}

vec3 calcLight(Light light) {
	if (!light.directional) { // Point light
		// Attenuation
		float dist = length(light.position - vPos);
		vec3 atten = vec3(
			uLiquidAtten + 0.02,
			uLiquidAtten + 0.01,
			uLiquidAtten
		);
		vec3 transmittance = exp(-atten * dist);

		return light.color * transmittance;
	} else { // Directional light
		vec3 lightDir = normalize(light.position);
		return light.color;
	}
}

void main() {
	float opacity = 1.0;

	// Depth test
	vec2 uv = gl_FragCoord.xy / uRes;
	float currentDepth = gl_FragCoord.z;
	// float closestDepth = texture(material.texture1, uv).r;

	// if (closestDepth <= currentDepth)
	// 	discard;

	// // Smooth particle transition
	// closestDepth = linearizeDepth(closestDepth);
	currentDepth = linearizeDepth(currentDepth);
	// float transitionSize = 0.02;
	// float depthDiff = clamp(closestDepth - currentDepth, 0.0, 1.0);
	// opacity *= smoothstep(0.0, transitionSize, depthDiff);

	// Sprite
	if (vProjSize > 1.0) {
		float radius = length(gl_PointCoord * 2.0 - 1.0);

		float threshold = 0.1;
		if (radius > 1.0)
			discard;
		else if (radius > threshold)
			opacity *= smoothstep(1.0, 0.0, (radius - threshold) / (1.0 - threshold));

		//opacity *= 1.0 - pow(radius, 3.0);
	}

	// Light
	vec3 illum = ambient;
	#if (!NO_LIGHTS)
		#for lightIdx in 0 to NUM_LIGHTS
			illum += calcLight(lights[##lightIdx]);
		#end
	#fi
	
	// Color
	oColor[1] = vec4(applyFog(vColor.rgb * illum, currentDepth), vColor.a * opacity);
}

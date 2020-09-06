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
uniform float uNoiseStrength;

in vec4 vColor;
in vec3 vPos;
in vec3 vFogCoeff;
in float vProjSize;
in float vDepthDist;

out vec4 oColor;

vec3 applyFog(vec3 color, vec3 fogCoeff, float noise) {
	// Beer's law
	float offset = 2.0 * noise * uNoiseStrength + 1.0 - uNoiseStrength;
	vec3 transmittance = exp(-fogCoeff * offset);

	return color * transmittance; // + uLiquidColor * (1.0 - max(max(transmittance.r, transmittance.g), transmittance.b));
}

void main() {
	float opacity = vColor.a;
	if (opacity == 0.0)
		discard;

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

	// Perlin noise
	float noise = texture(material.texture2, uv).r;
	
	// Fog
	vec3 color = applyFog(vColor.rgb, vFogCoeff, noise);

	// Color
	oColor = vec4(color, opacity);
}

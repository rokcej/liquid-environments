#version 300 es
precision highp float;

#define M_PI   3.141592653589793238462643
#define M_1_PI 0.318309886183790671537768 // 1 / PI

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


uniform vec3 uCameraPos;
uniform vec3 uLightPos;
uniform vec3 uLightDir;
uniform float uLightDist; // Distance between light and camera
uniform float uSeed;
in vec3 vPos;


float rand(vec3 xyz) {
    return fract(sin(mod(dot(xyz.xyz, vec3(12.9898, 78.233, 5.1337)), 3.14)) * 43667.146508724461335325378948);
}

float F(float u, float v) {
	vec2 uv = vec2(u / 10.0, v * 2.0 * M_1_PI);
	return texture(material.texture2, uv).r;
}

void main() {
	vec2 uv = gl_FragCoord.xy * uResInv;

	// Manual depth test
	float currentDepth = length(vEyePos);
	float closestDepth = texture(material.texture1, uv).r;
	float depth = min(currentDepth, closestDepth);

	// Light color
	vec3 color = vec3(0.7, 0.84, 1.0);
	float alpha = 1.0;


	////////////////////////////////////
	// Physically inaccurate approach //
	////////////////////////////////////

	// alpha *= (1.0 - exp(-0.01 * depth));// * exp(-0.1 * vLightDist);
	// // alpha *= exp(-vLightDist / depth);
	// // alpha *= depth / 100.0;


	/////////////////////////
	// Analytical approach //
	/////////////////////////

	float beta = 0.01; // Scattering coefficient
	float intensity = 5000.0; // Light source radiant intensity

	vec3 viewDir = normalize(vPos - uCameraPos);
	float cosGamma = max(dot(viewDir, -uLightDir), 0.0);
	float sinGamma = sqrt(1.0 - cosGamma * cosGamma);
	float gamma = acos(cosGamma);

	float Tvp = beta * depth;
	float Tsv = beta * uLightDist;

	float A1 = Tsv * sinGamma;
	float A0 = intensity * beta * beta * exp(-Tsv * cosGamma) / (2.0 * M_PI * A1);

	float La = A0 * (
		F(A1, 0.25 * M_PI + 0.5 * atan((Tvp - Tsv * cosGamma) / A1)) -
		F(A1, 0.5 * gamma)
	);

	alpha *= La;


	///////////////////////////////////////
	// Numerical approach (ray marching) //
	///////////////////////////////////////

	// int max_steps = 50;
	// float step_size = 0.05;

	// float off = rand(vec3(uv, uSeed * 100.0));
	// vec3 pos = vPos;
	// vec3 dir = vPos - uCameraPos;
	// float len = length(dir);
	// dir = dir / len;
	// len = min(len, depth);
	// int num_steps = int(len / step_size);
	// if (num_steps > max_steps) {
	// 	num_steps = max_steps;
	// 	step_size = len / float(num_steps);
	// }
	// vec3 inc = step_size * dir;
	// vec3 p = uCameraPos + inc * off;
	// float camDist = step_size * off;
	// float sum = 0.0;
	// if (num_steps > 0) {
	// 	for (int i = 0; i < num_steps; ++i) {
	// 		float lightDist = length(p - uLightPos);
	// 		float camDist = length(p - uCameraPos);
	// 		sum += exp(-0.1 * lightDist) / (1.0 + 0.01 * lightDist * lightDist) * exp(-0.001 * camDist);
	// 		p += inc;
	// 	}
	// 	sum /= float(num_steps);
	// 	sum *= len;
	// }
	//
	// alpha *= sum * 0.5;



	// Subtract shadow volumes
	if (gl_FrontFacing) {
		alpha *= -1.0;
	}

	// Color
	oColor = vec4(color, alpha);
}

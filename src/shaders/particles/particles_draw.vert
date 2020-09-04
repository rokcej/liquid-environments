#version 300 es
precision mediump float;

struct FrustumLight {
	vec3 position;
	vec3 color;
	mat4 matrix;
	float farPlane;
	float worldHeight;
};

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

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix

in vec3 VPos;       // Vertex position

#if (!NO_LIGHTS)
uniform Light lights[##NUM_LIGHTS];
#fi
#if (TRANSPARENT)
    uniform float alpha;
#else
    float alpha = 1.0;
#fi
uniform vec3 ambient;
uniform Material material;

uniform FrustumLight uFrustumLights[##NUM_FRUSTUM_LIGHTS];

uniform float uvOff;
uniform float pointSize;
uniform float uIntensity;

uniform vec3 uLiquidColor;
uniform vec3 uLiquidAtten;
uniform vec3 uLightAtten;
uniform vec2 uFogRange;
uniform vec2 uFogStrength;
uniform float uCameraHeight;
uniform float uNoiseStrength;

uniform float f; // Focal length
uniform float a; // Aperture radius
uniform float v0; // Distance in focus

// Output transformed vertex position
out vec4 vColor;
out vec3 vPos;
out vec3 vFogCoeff;
out float vProjSize;
out float vDepthDist;


vec3 calcFog(float depth, float height0, float height1) {
	float y0 = min(height0, height1);
	float y1 = max(height0, height1);
	float yMin = uFogRange.x;
	float yMax = uFogRange.y;
	float x0 = uFogStrength.x;
	float x1 = uFogStrength.y;

	float F = 0.0; // Integral sum
	if (y1 - y0 < 0.000001) {
		if (y0 < yMin)
			F = x0;
		else if (y0 > yMax)
			F = x1;
		else
			F = (y0 - yMin) / (yMax - yMin) * (x1 - x0) + x0;
	} else {
		float a, b; // Integration borders
		if (y0 < yMin) {
			a = y0;
			b = min(y1, yMin);
			F += x0 * (b - a);
		}
		if (y0 < yMax && y1 > yMin) {
			a = max(y0, yMin);
			b = min(y1, yMax);
			F += x0 * (b - a) + (x1 - x0) / (yMax - yMin) * (0.5 * (b * b - a * a) - yMin * (b - a));
		}
		if (y1 > yMax) {
			a = max(y0, yMax);
			b = y1;
			F += x1 * (b - a);
		}
		F /= (y1 - y0);
	}
	F *= depth;

	return uLiquidAtten * F;
}

float calcLightAtten(float dist) {
    // Attenuation
    return 1.0f / (uLightAtten.x + uLightAtten.y * dist + uLightAtten.z * (dist * dist));
}

vec3 calcLight(Light light) {
	if (!light.directional) { // Point light
		float dist = length(light.position - vPos);
		// Transmittance
		// TODO use actual noise texture
		float noise = 1.0 - 0.5 * uNoiseStrength; // Temporary placeholder, uses the average noise value
		vec3 transmittance = exp(-uLiquidAtten * dist * noise);
		return light.color * calcLightAtten(dist) * transmittance;
	} else { // Directional light
		vec3 lightDir = normalize(light.position);
		return light.color;
	}
}

vec3 calcFrustumLight(int index, sampler2D tex, vec3 posWorld) {
    vec4 posLS4 = uFrustumLights[index].matrix * vec4(posWorld, 1.0);
	vec3 posLS = (posLS4.xyz / posLS4.w) * 0.5 + 0.5;
	if (posLS.x > 0.0 && posLS.x < 1.0 && posLS.y > 0.0 && posLS.y < 1.0 && posLS.z < 1.0) {
		vec3 lightDir = uFrustumLights[index].position - vPos;
		float lightCurrentDepth = length(lightDir);
		if (lightCurrentDepth > 0.0)
			lightDir /= lightCurrentDepth;

        float bias = 0.005;
        float lightClosestDepth = texture(tex, posLS.xy).r * uFrustumLights[index].farPlane;
		vec2 texelSize = 1.0 / vec2(textureSize(tex, 0));
		float shadow = lightCurrentDepth - bias > lightClosestDepth ? 1.0 : 0.0;

		// Soft shadow edge
		float threshold = 0.15;
		float edgeDist = min(min(posLS.x, 1.0 - posLS.x), min(posLS.y, 1.0 - posLS.y));
		float atten = 1.0 - smoothstep(0.0, threshold, edgeDist);
		shadow = min(shadow + atten, 1.0); 

		// Transmittance
		vec3 fogCoeff = calcFog(lightCurrentDepth, posWorld.y, uFrustumLights[index].worldHeight);
		vec3 transmittance = exp(-fogCoeff);

		return (1.0 - shadow) * uFrustumLights[index].color * calcLightAtten(lightCurrentDepth) * transmittance;
	}
	return vec3(0.0);
}


void main() {
    // Data
    vec4 texel0 = texture(material.texture0, VPos.xy);
    vec4 texel1 = texture(material.texture0, VPos.xy + vec2(uvOff, 0.0));

    vec3 pos = texel0.xyz;
    float life = texel1.x;
    float age  = texel1.y;

    // Projected position
    vec4 eyePos = MVMat * vec4(pos, 1.0);
    vPos = eyePos.xyz / eyePos.w;
    gl_Position = PMat * eyePos;
    vDepthDist = length(vPos);

    // Projected point size
    vec4 projSize4 = PMat * vec4(pointSize, 0.0, eyePos.zw);
    vProjSize = projSize4.x / projSize4.w;

	// Fog
	vFogCoeff = calcFog(vDepthDist, pos.y, uCameraHeight);

    // Opacity of subpixel particles
    float opacity = vProjSize >= 1.0 ? 1.0 : vProjSize * vProjSize;

	// Opacity of new/old particles
    float fadeTime = 1.0;
    opacity *= min(smoothstep(0.0, fadeTime, age), smoothstep(0.0, fadeTime, life));

    // Pseudo-DOF
    float coc = a * abs(f / (v0 - f)) * abs(v0 / vDepthDist - 1.0);
	float blurredSize = vProjSize + coc;
	opacity *= (vProjSize * vProjSize) / (blurredSize * blurredSize);
	vProjSize = blurredSize;

    // RenderCore Lights
	vec3 illum = ambient;
	#if (!NO_LIGHTS)
		#for lightIdx in 0 to NUM_LIGHTS
			illum += calcLight(lights[##lightIdx]);
		#end
	#fi
    
    // Volume lights
    #for I_TEX in 4 to NUM_TEX
		illum += calcFrustumLight(##I_TEX - 4, material.texture##I_TEX, pos);
	#end

    vec3 color = uIntensity * illum * material.diffuse;

    vColor = vec4(color, opacity * alpha);
    gl_PointSize = vProjSize;
}

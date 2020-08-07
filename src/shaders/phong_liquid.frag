#version 300 es
precision mediump float;

struct Light {
	bool directional;
	vec3 position;
	vec3 color;
};

struct Material {
	vec3 diffuse;
	vec3 specular;
	float shininess;

	#if (TEXTURE)
		#for I_TEX in 0 to NUM_TEX
			sampler2D texture##I_TEX;
		#end
	#fi
};

#if (!NO_LIGHTS)
uniform Light lights[##NUM_LIGHTS];
#fi

uniform vec3 ambient;
uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi

uniform vec3 uLiquidAtten;

// From vertex shader
in vec3 fragVNorm;
in vec3 fragVPos;

#if (TEXTURE)
	in vec2 fragUV;
#fi

#if (COLORS)
	in vec4 fragVColor;
#fi

#if (CLIPPING_PLANES)
	struct ClippingPlane {
		vec3 normal;
		float constant;
	};

	uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

	in vec3 vViewPosition;
#fi

out vec4 oColor[3];

// Calculates the point light color contribution
vec3 calcPointLight (Light light, vec3 normal, vec3 viewDir) {
	vec3 lightDir = normalize(light.position - fragVPos);

	// Difuse
	float diffuseF = max(dot(lightDir, normal), 0.0f);

	// Specular
	vec3 reflectDir = reflect(-lightDir, normal);
	float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);

	// Attenuation
	float dist = length(light.position - fragVPos);
	float attenuation = 1.0f / (1.0f + 0.01f * dist + 0.0001f * (dist * dist));

	// Transmittance
	vec3 transmittance = exp(-uLiquidAtten * dist);

	// Combine results
	vec3 diffuse  = light.color * diffuseF  * material.diffuse  * transmittance * attenuation;
	vec3 specular = light.color * specularF * material.specular * transmittance * attenuation;

	// Attenuation
	return (diffuse + specular);
}

vec3 calcDirectLight (Light light, vec3 normal, vec3 viewDir) {
	vec3 lightDir = normalize(light.position);

	// Difuse
	float diffuseF = max(dot(normal, lightDir), 0.0f);

	// Specular
	vec3 reflectDir = reflect(-lightDir, normal);
	float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);

	// Combine results
	vec3 diffuse  = light.color  * diffuseF * material.diffuse;
	vec3 specular = light.color * specularF * material.specular;

	return (diffuse + specular);
}

void main() {
	#if (CLIPPING_PLANES)
		bool clipped = true;
		for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++){
				clipped = ( dot( vViewPosition, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
		}
		if ( clipped ) discard;
	#fi

	#if (CIRCLES)
		vec2 cxy = 2.0 * gl_PointCoord - 1.0;
		float pct = dot(cxy, cxy);
		if (pct > 1.0) {
			discard; //performance trap
			//oColor = vec4(1.0, 1.0, 1.0, 0.0);
		}
	#fi

	vec3 normal = normalize(fragVNorm);
	vec3 viewDir = normalize(-fragVPos);

	// Calculate combined light contribution
	vec3 combined = ambient;

	#if (!NO_LIGHTS)
		#for lightIdx in 0 to NUM_LIGHTS
			if (!lights[##lightIdx].directional) {
				combined += calcPointLight(lights[##lightIdx], normal, viewDir);
			}
			else {
				combined += calcDirectLight(lights[##lightIdx], normal, viewDir);
			}
		#end
	#fi

	oColor[0] = vec4(combined, alpha);

	#if (TEXTURE)
		// Apply all of the textures
		#for I_TEX in 0 to NUM_TEX
			oColor[0] *= texture(material.texture##I_TEX, fragUV);
		#end

	#fi

	#if (COLORS)
		oColor[0] *= vec4(fragVColor.rgb, alpha);
	#fi

	oColor[1] = vec4(normal, 1.0);
	oColor[2] = vec4(abs(fragVPos), 1.0);
}
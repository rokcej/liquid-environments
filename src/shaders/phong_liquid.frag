#version 300 es
precision mediump float;

struct FrustumLight {
	vec3 position;
	vec3 color;
	mat4 matrix;
	float farPlane;
};

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

// TODO Get points in circle instead of square and shift values from [0,1] to [-1, 1]
const vec2 poissonDisk[48] = vec2[] (
	vec2(0.3466310444034956, 0.0014412284351179305),
	vec2(0.4700794029631746, 0.008339853449402385),
	vec2(0.07868754055117005, 0.10924546185163907),
	vec2(0.24145268967335853, 0.07442299464708274),
	vec2(0.6522000467547264, 0.10859431496234073),
	vec2(0.00034436055942371757, 0.20878428149068673),
	vec2(0.33920868572779533, 0.1419189774896642),
	vec2(0.48659387610504345, 0.1537263492143509),
	vec2(0.10048150213737483, 0.24401797628069546),
	vec2(0.20567993959070474, 0.2337813697543566),
	vec2(0.6053606246412543, 0.24222590707430958),
	vec2(0.009856519563621817, 0.32872496122981615),
	vec2(0.25878490112521163, 0.3202371281913122),
	vec2(0.40688313935298764, 0.3332695616145249),
	vec2(0.7864710475176858, 0.3246569316450103),
	vec2(0.1684371233474871, 0.3767775412804689),
	vec2(0.35473632593400656, 0.4206803649567055),
	vec2(0.4851822112439358, 0.41060791171981126),
	vec2(0.602165158864929, 0.3616968170490609),
	vec2(0.00645555518211148, 0.4501124313828946),
	vec2(0.24325357067770023, 0.48517953316700835),
	vec2(0.6672620848110757, 0.459899576503482),
	vec2(0.7927786835281065, 0.4332152172840252),
	vec2(0.910074665445358, 0.47857174774968203),
	vec2(0.1256142432410413, 0.5058355290812249),
	vec2(0.3170802976934687, 0.556476899061377),
	vec2(0.5513056520854173, 0.533672715783966),
	vec2(0.41040853128505983, 0.5971465814776126),
	vec2(0.676525200647825, 0.5811811718984293),
	vec2(0.7831828058069222, 0.610174757682017),
	vec2(0.9021365355203033, 0.5948454230860739),
	vec2(0.16630819000747943, 0.6740887039833086),
	vec2(0.3018808208546889, 0.672130397479212),
	vec2(0.5713206091919747, 0.7059762485585602),
	vec2(0.8848562674667506, 0.7606492911750109),
	vec2(0.9794893453748768, 0.7228807649073776),
	vec2(0.08983644499078902, 0.811737224335234),
	vec2(0.2867749149129122, 0.7891561939931127),
	vec2(0.5278572037217, 0.8214822292204268),
	vec2(0.7082814763518566, 0.7848367659133931),
	vec2(0.3732604151633051, 0.8561603086334784),
	vec2(0.9644663108729841, 0.8912707311770747),
	vec2(0.017148465705183774, 0.9406725480312335),
	vec2(0.20119102884315562, 0.923253459014631),
	vec2(0.5322186091645914, 0.9757970518323239),
	vec2(0.6611862892526089, 0.9544471180451968),
	vec2(0.8433284854009812, 0.9235056644485571),
	vec2(0.357224782173487, 0.992906360496118)
);

float rand(vec2 xy) {
    return fract(sin(dot(xy.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float rand(vec3 xyz) {
    return fract(sin(mod(dot(xyz.xyz, vec3(12.9898, 78.233, 5.1337)), 3.14)) * 43667.146508724461335325378948);
}

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

// uniform float uFarPlane;

// in vec4 fragVPos4LS;
// in vec4 fragVPos4LV;

uniform FrustumLight uFrustumLights[##NUM_FRUSTUM_LIGHTS];
in vec4 vPosLS[##NUM_FRUSTUM_LIGHTS]; // Light space position

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


vec3 calcFrustumLight(int index, sampler2D tex, vec3 normal, vec3 viewDir) {
	vec3 posLS = (vPosLS[index].xyz / vPosLS[index].w) * 0.5 + 0.5;
	if (posLS.x > 0.0 && posLS.x < 1.0 && posLS.y > 0.0 && posLS.y < 1.0 && posLS.z < 1.0) {
		vec3 lightDir = uFrustumLights[index].position - fragVPos;
		float lightCurrentDepth = length(lightDir);
		if (lightCurrentDepth > 0.0)
			lightDir /= lightCurrentDepth;
		// TODO fix bias
		float bias = max(0.2 * (1.0 - dot(normal, lightDir)), 0.05);

		vec2 texelSize = 1.0 / vec2(textureSize(tex, 0));

		float shadow = 0.0;
		for (int x = -1; x <= 1; ++x) {
			for (int y = -1; y <= 1; ++y) {
				float pcfDepth = texture(tex, posLS.xy + vec2(x, y) * texelSize).r * uFrustumLights[index].farPlane; 
				shadow += lightCurrentDepth - bias > pcfDepth ? 1.0 : 0.0;        
			}    
		}
		shadow /= 9.0;

		// // http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-16-shadow-mapping/#poisson-sampling
		// for (int i = 0; i < 9; ++i) {
		// 	int idx = int(rand(fragVPos) * 47.999);
		// 	float poissonDepth = texture(tex, posLS.xy + (poissonDisk[idx] - vec2(0.5)) * texelSize * 2.0).r * uFarPlane; 
		// 	shadow += lightCurrentDepth - bias > poissonDepth ? 1.0 : 0.0;  
		// }
		// shadow /= 9.0;

		// Soft shadow edge
		float threshold = 0.15;
		float edgeDist = min(min(posLS.x, 1.0 - posLS.x), min(posLS.y, 1.0 - posLS.y));
		float atten = 1.0 - smoothstep(0.0, threshold, edgeDist);
		shadow = min(shadow + atten, 1.0); 

		return (1.0 - shadow) * calcPointLight(Light(false, uFrustumLights[index].position, uFrustumLights[index].color), normal, viewDir);
	}
	return vec3(0.0);
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

	#for I_LIGHT in 0 to NUM_FRUSTUM_LIGHTS
		combined += calcFrustumLight(##I_LIGHT, material.texture##I_LIGHT, normal, viewDir);
	#end

	#if (!NO_LIGHTS)
		#for lightIdx in 0 to NUM_LIGHTS
			if (!lights[##lightIdx].directional)
				combined += calcPointLight(lights[##lightIdx], normal, viewDir);
			else
				combined += calcDirectLight(lights[##lightIdx], normal, viewDir);
		#end
	#fi

	oColor[0] = vec4(combined, alpha);

	// #if (TEXTURE)
	// 	// Apply all of the textures
	// 	#for I_TEX in 0 to NUM_TEX
	// 		oColor[0] *= texture(material.texture##I_TEX, fragUV);
	// 	#end
	// #fi

	#if (COLORS)
		oColor[0] *= vec4(fragVColor.rgb, alpha);
	#fi

	oColor[1] = vec4(normal, 1.0);
	oColor[2] = vec4(abs(fragVPos), 1.0);
}

#version 300 es
precision mediump float;


#if (INSTANCED)
//uniform mat4 VMat;
uniform mat4 MVMat;
#fi
#if (!INSTANCED)
uniform mat4 MVMat; // Model View Matrix
#fi
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

// Output transformed vertex position, normal and texture coordinate
//out vec3 fragVPos;
//out vec3 fragVNorm;
flat out vec4 fragVColor;


#if (COLORS)
    in vec4 VColor;
#fi

#if (TEXTURE)
    in vec2 uv;          // Texture coordinate
    out vec2 fragUV;
#fi


#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi


//STRUCT
//**********************************************************************************************************************
struct Light {
    bool directional;
    vec3 position;
    vec3 color;
};
#if (LIGHTS && !NO_LIGHTS)
uniform Light lights[##NUM_LIGHTS];
#fi

struct Material {
    vec3 diffuse;
    vec3 specular;
    float shininess;
};
uniform vec3 ambient;
uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
    float alpha = 1.0;
#fi


//FUNCTIONS
//**********************************************************************************************************************
// Calculates the point light color contribution
vec3 calcPointLight (vec3 fragVPos, Light light, vec3 normal, vec3 viewDir) {

    vec3 lightDir = normalize(light.position - fragVPos);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);

    // Attenuation
    float distance = length(light.position - fragVPos);
    float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    vec3 specular = light.color * specularF * material.specular * attenuation;

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


//MAIN
//**********************************************************************************************************************
void main() {
    // Model view position
    //vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0); //original (non-instanced)
    #if (!INSTANCED)
    vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //vec4 VPos_viewspace = VMat * MMat * vec4(VPos, 1.0);
    vec4 VPos_viewspace = MVMat * MMat * vec4(VPos, 1.0);
    #fi

    // Projected position
    gl_Position = PMat * VPos_viewspace;




    fragVColor = vec4(0.0, 0.0, 0.0, alpha);
    #if (LIGHTS && !NO_LIGHTS)
        vec3 normal = normalize(NMat * VNorm);
        vec3 viewDir = normalize(-VPos_viewspace.xyz);

        // Calculate combined light contribution
        vec3 combined = ambient;

        #for lightIdx in 0 to NUM_LIGHTS
            if (!lights[##lightIdx].directional) {
                combined += calcPointLight(VPos_viewspace.xyz, lights[##lightIdx], normal, viewDir);
            }
            else {
                combined += calcDirectLight(lights[##lightIdx], normal, viewDir);
            }
        #end

        fragVColor = vec4(combined, alpha);
    #fi
    #if (!LIGHTS)
        fragVColor = vec4(material.diffuse, alpha); // material.diffuse + material.specular?
    #fi




    #if (COLORS && (LIGHTS && !NO_LIGHTS))
        // Pass vertex color to fragment shader
        fragVColor *= VColor;
    #fi
    #if (COLORS && !LIGHTS)
        // Pass vertex color to fragment shader
        fragVColor += VColor;
    #fi

    #if (TEXTURE)
        // Pass-through texture coordinate
        fragUV = uv;
    #fi


    #if (POINTS)
        gl_PointSize = pointSize / length(VPos_viewspace.xyz);
        if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos_viewspace.xyz;
    #fi
}
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


#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position



//out vec3 fragVPos;

flat out vec4 fragVColor;


#if (COLORS)
    in vec4 VColor;
#fi

#if (TEXTURE)
    in vec2 uv;
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
uniform vec3 ambient;
#fi

struct Material {
    vec3 diffuse;
};
uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi


//FUNCTIONS
//**********************************************************************************************************************
#if (LIGHTS && !NO_LIGHTS)
// Calculates the point light color contribution
vec3 calcPointLight(vec3 fragVPos, Light light) {
    // Attenuation
    float distance = length(light.position - fragVPos);
    float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));

    // Combine results
    vec3 diffuse = light.color * material.diffuse * attenuation;

    return diffuse;
}
#fi


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




    #if (LIGHTS && !NO_LIGHTS)
        fragVColor = vec4(0.0, 0.0, 0.0, alpha);

        #for lightIdx in 0 to NUM_LIGHTS
            if (!lights[##lightIdx].directional) {
                fragVColor += vec4(calcPointLight(VPos_viewspace.xyz, lights[##lightIdx]), 0);
            }
            else {
                fragVColor += vec4(lights[##lightIdx].color * material.diffuse, 0);
            }
        #end
    #else
        fragVColor = vec4(material.diffuse, alpha);
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
        // Pass-through texture coordinate // Pass uv coordinate to fragment shader
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
#version 300 es
precision mediump float;
precision highp int;


#define PI 3.14159265359


struct Light {
    bool directional;
    vec3 position;  //In CAMERA SPACE
    vec3 color;
};

struct Material {
    vec3 diffuse;
    vec3 emissive;
    float alpha;
};



uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix
#if (!NO_LIGHTS)
uniform Light lights[##NUM_LIGHTS];
#fi
uniform Material material;


in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal


#if (CLIPPING_PLANES)
out vec3 vViewPosition;
#fi
//out vec3 vColor;
//out float vAlpha;
#if (FRONT_SIDE || FRONT_AND_BACK_SIDE)
out vec4 vColor;
#fi
#if (BACK_SIDE || FRONT_AND_BACK_SIDE)
out vec4 vColorBack;
#fi
//out vec3 fragVPos;
//out vec3 fragVNorm;



void main() {
    //vec3 color = vec3(0.0, 0.0, 0.0);
    vec3 color = material.emissive; //!!!!!!!!!!!!
    vec3 colorBack = material.emissive;
    float alpha = material.alpha;
    //color = color * alpha;

    vec3 norm = vec3(NMat * VNorm);
    vec4 VPos4 = MVMat * vec4(VPos, 1.0);
    #if (CLIPPING_PLANES)
    vViewPosition = -VPos;
    #fi
    //fragVPos = vec3(VPos4) / VPos4.w;
    //fragVNorm = norm;

    vec3 normN = normalize(norm);
    vec3 L;
    vec3 normL;
    //float distanceL;
    float cosTheta;

    //float attenuation;



    //vec4 as = MVMat * vec4(VPos, 1.0);
    //color = MaterialEmissionColor + MaterialAmbientColor + MaterialDiffuseColor * LightColor * LightPower * cosTheta / (distance*distance);

    for(int i = 0; i < ##NUM_LIGHTS; i++){
        //L = lights[i].position - VPos;
        //L = lights[i].position - (vec3(VPos4) / VPos4.w);
        L = lights[i].position - VPos4.xyz;
        //distanceL = length(L);

        normL = normalize(L);
        //cosTheta = max(dot(normN, normL), 0.0);
        cosTheta = dot(normN, normL);

        //attenuation = 1.0f / (1.0f + 0.01f * distanceL + 0.0001f * (distanceL * distanceL));
        //color += material.diffuse * lights[i].color * cosTheta * attenuation;

        #if (FRONT_SIDE || FRONT_AND_BACK_SIDE)
        color += material.diffuse * lights[i].color * max(cosTheta, 0.0);
        #fi
        #if (BACK_SIDE || FRONT_AND_BACK_SIDE)
        colorBack += material.diffuse * lights[i].color * max(-cosTheta, 0.0);
        #fi
    }


    //vColor = color;
    //vAlpha = alpha;
    #if (FRONT_SIDE || FRONT_AND_BACK_SIDE)
    vColor = vec4(color, alpha);
    #fi
    #if (BACK_SIDE || FRONT_AND_BACK_SIDE)
    vColorBack = vec4(colorBack, alpha);
    #fi


    //gl_Position = PMat * MVMat * vec4(VPos, 1.0);
    gl_Position = PMat * VPos4;
}
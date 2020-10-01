#version 300 es
precision highp float;


#define LOG2 1.442695


struct Material {
    #if (TEXTURE)
        sampler2D texture0;
        sampler2D texture1;
    #fi
};


uniform Material material;
uniform int MODE;
uniform vec4 fogColor;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}


void main() {
    #if (TEXTURE)
    //vec4 fogColor = vec4(1.0, 1.0, 1.0, 1.0);

    if(MODE == 0){
        //FOG BY DEPTH

        float fog_near = 0.9992;
        float fog_far = 1.0;

        float fogDepth = texture(material.texture1, fragUV).r; //DEPTH

        float fogAmount = smoothstep(fog_near, fog_far, fogDepth);


        color = mix(texture(material.texture0, fragUV).rgba, fogColor, fogAmount);
    }else if(MODE == 1){
        //FOG BY DISTANCE TO CAMERA

        float fogDensity = 0.004;
        float fogStartDistance = 128.0;

        float fogDistance = texture(material.texture1, fragUV).r; //DISTANCE TO CAMERA
        fogDistance = max(fogDistance - fogStartDistance, 0.0);

        float fogAmount = 1.0 - exp2(-fogDensity * fogDensity * fogDistance * fogDistance * LOG2);
        //fogAmount = clamp(fogAmount, 0.0, 1.0);


        color = mix(texture(material.texture0, fragUV).rgba, fogColor, fogAmount);
    }
    #fi
}
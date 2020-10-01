#version 300 es
precision mediump float;
precision highp int;



#if (CLIPPING_PLANES)
struct ClippingPlane {
    vec3 normal;
    float constant;
};
#fi



#if (CLIPPING_PLANES)
uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];
#fi


#if (CLIPPING_PLANES)
in vec3 vViewPosition;
#fi
//in vec3 vColor;
//in float vAlpha;
#if (FRONT_SIDE || FRONT_AND_BACK_SIDE)
in vec4 vColor;
#fi
#if (BACK_SIDE || FRONT_AND_BACK_SIDE)
in vec4 vColorBack;
#fi
//in vec3 fragVPos;
//in vec3 fragVNorm;


out vec4 color;
//out vec4 color[3];



void main() {

    #if (CLIPPING_PLANES)
    bool clipped = true;
    for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++){
            clipped = ( dot( vViewPosition, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
    }
    if ( clipped ) discard;

                /*bool clipped = true;

                clipped = ( dot( vViewPosition, clippingPlanes[0].normal ) > clippingPlanes[0].constant ) && clipped;

                clipped = ( dot( vViewPosition, clippingPlanes[1].normal ) > clippingPlanes[1].constant ) && clipped;

                clipped = ( dot( vViewPosition, clippingPlanes[2].normal ) > clippingPlanes[2].constant ) && clipped;
                if ( clipped ) discard;*/
    #fi



    //color = vec4(vColor, vAlpha);
    //color = vColor;

    #if (FRONT_SIDE)
    color = vColor;
    #fi
    #if (BACK_SIDE)
    color = vColorBack;
    #fi
    #if (FRONT_AND_BACK_SIDE)
    if (gl_FrontFacing){
        color = vColor;
    }else{
        color = vColorBack;
    }
    #fi

    //color[0] = vec4(vColor, vAlpha);
    //color[1] = vec4(normalize(fragVNorm), 1.0);
    //color[2] = vec4(abs(fragVPos), 1.0);
}
#version 300 es
precision mediump float;


#if (INSTANCED)
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
#if (OUTLINE)
    in vec3 VNorm;      // Vertex normal
    uniform float offset;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi

out vec3 vFragPos;

void main() {
    // Model view position
    #if (!OUTLINE)
        #if (!INSTANCED)
        vec4 VPos4 = MVMat * vec4(VPos, 1.0);
        #fi
        #if (INSTANCED)
        vec4 VPos4 = MVMat * MMat * vec4(VPos, 1.0);
        #fi
    #fi
    #if (OUTLINE)
        #if (!INSTANCED)
        vec4 VPos4 = MVMat * vec4(VPos + VNorm * offset, 1.0);
        #fi
        #if (INSTANCED)
        vec4 VPos4 = MVMat * MMat * vec4(VPos + VNorm * offset, 1.0);
        #fi
    #fi

    // Projected position
    gl_Position = PMat * VPos4;
	vFragPos = VPos4.xyz / VPos4.w;

    // #if (CLIPPING_PLANES)
    //     vViewPosition = -VPos4.xyz;
    // #fi
 }

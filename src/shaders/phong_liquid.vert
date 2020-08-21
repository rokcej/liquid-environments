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

#if (TEXTURE)
	in vec2 uv;          // Texture coordinate
#fi

#if (COLORS)
	in vec4 VColor;
	out vec4 fragVColor;
#fi

// Output transformed vertex position, normal and texture coordinate
out vec3 fragVPos;
out vec3 fragVNorm;
#if (TEXTURE)
out vec2 fragUV;
#fi

#if (POINTS)
	uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
	out vec3 vViewPosition;
#fi



out vec4 fragVPos4LS;
out vec4 fragVPos4LV;

uniform mat4 uMMat;
//uniform mat4 uLSMat;
uniform mat4 uLPMat;
uniform mat4 uLVMat;

void main() {
	// Model view position
	#if (!INSTANCED)
	vec4 VPos4 = MVMat * vec4(VPos, 1.0);
	vec4 VPos4LV = uLVMat * uMMat * vec4(VPos, 1.0);
	vec4 VPos4LPV = uLPMat * VPos4LV;
	#fi
	#if (INSTANCED)
	vec4 VPos4 = MVMat * MMat * vec4(VPos, 1.0);
	vec4 VPos4LV = uLVMat * uMMat * MMat * vec4(VPos, 1.0);
	vec4 VPos4LPV = uLPMat * VPos4LV;
	#fi

	// Projected position
	gl_Position = PMat * VPos4;
	fragVPos = vec3(VPos4) / VPos4.w;
	fragVPos4LS = VPos4LPV;
	fragVPos4LV = VPos4LV;

	// Transform normal
	#if (!INSTANCED)
	fragVNorm = vec3(NMat * VNorm);
	#fi
	#if (INSTANCED)
	fragVNorm = vec3(NMat * mat3(MMat) * VNorm);
	#fi

	#if (TEXTURE)
		// Pass-through texture coordinate
		fragUV = uv;
	#fi

	#if (COLORS)
		// Pass vertex color to fragment shader
		fragVColor = VColor;
	#fi

	#if (POINTS)
		gl_PointSize = pointSize / length(VPos4.xyz);
		if(gl_PointSize < 1.0) gl_PointSize = 1.0;
	#fi

	#if (CLIPPING_PLANES)
		vViewPosition = -VPos4.xyz;
	#fi
}

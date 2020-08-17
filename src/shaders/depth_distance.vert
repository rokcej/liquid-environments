#version 300 es
precision mediump float;

uniform mat4 uVPMatInv;
uniform vec3 uCameraPos;

in vec3 VPos; // Vertex position

#if (TEXTURE)
    in vec2 uv;  // Texture coordinate
#fi

// Output quad texture coordinates
out vec2 fragUV;

out vec3 vFragDir;

void main() {
    gl_Position = vec4(VPos, 1.0);

    #if (TEXTURE)
        // Pass-through texture coordinate
        fragUV = uv;
    #fi

	// Fragment direction
	vec4 fragDir4 = uVPMatInv * vec4(VPos, 1.0);
	vFragDir = normalize(fragDir4.xyz / fragDir4.w - uCameraPos);
}

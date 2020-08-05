#version 300 es
precision mediump float;


in vec3 VPos;       // Vertex position

#if (TEXTURE)
	in vec2 uv;
	out vec2 fragUV;
#fi

void main() {
	// Projected position
	gl_Position = vec4(VPos, 1.0);

	#if (TEXTURE)
		// Pass uv coordinate to fragment shader
		fragUV = uv;
	#fi
}

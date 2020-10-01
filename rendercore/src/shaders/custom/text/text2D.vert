#version 300 es
precision mediump float;


in vec2 VPos; // Vertex position (screenspace)
#if (TEXTURE)
in vec2 uv;  // Texture coordinate
#fi

// Output quad texture coordinates
out vec2 fragUV;


void main() {
    vec2 viewportHalfSize = vec2(1280, 720) * 0.5;

    //map [0, x][0, y] to [-1, 1][-1, 1]
    vec2 VPos_clipspace = (VPos - viewportHalfSize) / viewportHalfSize;

    // Vertex position in clip space
    gl_Position = vec4(VPos_clipspace, 0.0, 1.0);


    #if (TEXTURE)
    // Pass-through texture coordinate
    fragUV = uv;
    #fi
}

#version 300 es
precision highp float;

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix

in vec3 VPos;       // Vertex position

struct Material {
	sampler2D texture0;
    sampler2D texture1;
};

uniform Material material;
uniform float uvOff;

// Output transformed vertex position
out vec4 vColor;
out float vProjSize;

uniform float pointSize;

void main() {
    // Data
    vec4 texel0 = texture(material.texture0, VPos.xy);
    vec4 texel1 = texture(material.texture0, VPos.xy + vec2(uvOff, 0.0));

    vec3 pos = texel0.xyz;
    float life = texel0.w;

    // Projected position
    vec4 eyePos = MVMat * vec4(pos, 1.0);
    gl_Position = PMat * eyePos;

    // Projected point size
    vec4 projSize4 = PMat * vec4(pointSize, 0.0, eyePos.zw);
    vProjSize = projSize4.x / projSize4.w;
    gl_PointSize = vProjSize;

    // Particle colour
    float opacity = vProjSize >= 1.0 ? 1.0 : vProjSize;// * vProjSize;
    vColor = vec4(1.0, 1.0, 1.0, opacity);
}

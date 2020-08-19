#version 300 es
precision mediump float;

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix

in vec3 VPos;       // Vertex position

struct Material {
    vec3 diffuse;

	#for I_TEX in 0 to NUM_TEX
		sampler2D texture##I_TEX;
	#end
};

#if (TRANSPARENT)
    uniform float alpha;
#else
    float alpha = 1.0;
#fi

uniform Material material;
uniform float uvOff;
uniform float pointSize;

// Output transformed vertex position
out vec4 vColor;
out vec3 vPos;
out float vProjSize;
out float vDepthDist;


void main() {
    // Data
    vec4 texel0 = texture(material.texture0, VPos.xy);
    //vec4 texel1 = texture(material.texture0, VPos.xy + vec2(uvOff, 0.0));
    vec4 texel2 = texture(material.texture0, VPos.xy + vec2(uvOff * 2.0, 0.0));

    vec3 pos = texel0.xyz;
    float life = texel0.w;
    float age  = texel2.w;

    // Projected position
    vec4 eyePos = MVMat * vec4(pos, 1.0);
    vPos = eyePos.xyz / eyePos.w;
    gl_Position = PMat * eyePos;
    vDepthDist = length(vPos);

    // Projected point size
    vec4 projSize4 = PMat * vec4(pointSize, 0.0, eyePos.zw);
    vProjSize = projSize4.x / projSize4.w;

    // Opacity
    float opacity = vProjSize >= 1.0 ? 1.0 : vProjSize * vProjSize;
    float fadeTime = 1.0;
    opacity *= min(smoothstep(0.0, fadeTime, age), smoothstep(0.0, fadeTime, life));

    vColor = vec4(material.diffuse, opacity * alpha);
    gl_PointSize = vProjSize;
}

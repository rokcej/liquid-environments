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

uniform mat4 uVPMatInv;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform float uFarPlane;

// Output transformed vertex position
out vec3 vEyePos;


void main() {
	vec3 pos;
	if (VPos.z == 0.0) {
		vec2 uv = VPos.xy;
		vec4 pos4 = uVPMatInv * vec4(uv * 2.0 - 1.0, 0.0, 1.0);

		float dist = texture(material.texture0, uv).r * uFarPlane; // - 0.001;
		vec3 dir = normalize(pos4.xyz / pos4.w - uLightPos);

		pos = uLightPos + dir * dist;
	} else {
		pos = uLightPos;
	}

	pos += normalize(uCameraPos - pos) * 0.1;

	vec4 eyePos4 = MVMat * vec4(pos, 1.0);
	gl_Position = PMat * eyePos4;
	vEyePos = eyePos4.xyz / eyePos4.w;
}
